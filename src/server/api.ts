/**
 * Express API Server for Portfolio Rotation Agent
 * Provides REST endpoints for dashboard UI
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { UserService } from '../services/user-service.js';
import { FinnhubService } from '../services/finnhub-service.js';
import { MarketData } from '../data/market_data.js';
import { clerkMiddleware, requireAuth as clerkRequireAuth } from '@clerk/express';

// Initialize services
const finnhubService = new FinnhubService(process.env.FINNHUB_API_KEY!);
const marketData = new MarketData();

// Initialize stock data ingestion service
let stockDataIngestionService: any = null;
if (process.env.DATABASE_URL && process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT) {
  const { StockDataIngestionService } = await import('../services/stock-data-ingestion.js');
  stockDataIngestionService = new StockDataIngestionService(
    process.env.FINNHUB_API_KEY!,
    process.env.DATABASE_URL!,
    {
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
      embeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME || 'text-embedding-ada-002',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    }
  );

  // Start continuous ingestion for top stocks (every 15 minutes)
  const topStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX'];
  await stockDataIngestionService.startContinuousIngestion(topStocks, 15);
  console.log('✅ Stock data ingestion service started');
}

// Simple auth helper
function getUserId(req: any): string {
  return req.auth?.userId || 'anonymous';
}

// Use Clerk's requireAuth middleware
const requireAuth = clerkRequireAuth() as any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Public endpoints (no authentication required)
/**
 * GET /health - Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Clerk middleware will automatically use CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY from env
app.use(clerkMiddleware());
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize UserService for multi-user support
const userService = new UserService(process.env.DATABASE_URL!);

// TODO: Refactor ChatService to support per-user instances
// For now, chat service is disabled in multi-user mode
const chatService = null;

// Protected API Endpoints (require authentication)

/**
 * GET /api/portfolio - Get current portfolio state (user-specific)
 */
app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);
    const output = agent.getAgentOutput();

    res.json({
      totalValue: output.performance.totalValue,
      cash: output.performance.cash,
      unrealizedPnL: output.performance.unrealizedPnL,
      unrealizedPnLPercent: output.performance.unrealizedPnLPercent,
      maxDrawdown: output.performance.maxDrawdown,
      positionCount: agent.getPositions().length,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/positions - Get all active positions (user-specific)
 */
app.get('/api/positions', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);
    const positions = agent.getPositions().map((pos: any) => ({
      ticker: pos.ticker,
      shares: pos.shares,
      entryPrice: pos.entryPrice,
      currentPrice: pos.currentPrice,
      entryScore: pos.entryScore,
      unrealizedPnL: pos.getUnrealizedPnL(),
      unrealizedPnLPercent: pos.getUnrealizedPnLPercent(),
      value: pos.getValue(),
      entryTimestamp: pos.entryTimestamp,
    }));
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/scores - Get watchlist scores (user-specific)
 */
app.get('/api/scores', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);

    // Build comprehensive ticker list: Top 25 + Watchlist + Owned
    const top25 = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
      'BRK.B', 'V', 'JNJ', 'WMT', 'JPM', 'MA', 'PG',
      'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'CRM', 'NFLX',
      'CSCO', 'PEP', 'TMO'
    ];

    // Get user's custom watchlist
    const watchlists = await userService.getUserWatchlists(userId);
    const defaultWatchlist = watchlists.find(w => w.name === 'default');
    const watchlistTickers = defaultWatchlist?.tickers || [];

    // Get currently owned positions
    const currentPositions = agent.getPositions();
    const ownedTickers = currentPositions.map((p: any) => p.ticker);

    // Combine all tickers and remove duplicates
    const allTickers = [...new Set([...top25, ...watchlistTickers, ...ownedTickers])];
    console.log(`[/api/scores] Analyzing ${allTickers.length} tickers for user ${userId}`);

    const result = await agent.analyzeWatchlist(allTickers);
    console.log(`[/api/scores] Received ${result.scores.size} scores from analysis`);

    // Fetch current prices for all tickers using MarketData
    const pricePromises = allTickers.map(async (ticker) => {
      try {
        const candles = await marketData.fetchCandles(ticker, 1);
        const latestPrice = candles.prices.length > 0 ? candles.prices[candles.prices.length - 1] : 0;
        return [ticker, latestPrice] as [string, number];
      } catch (error) {
        console.error(`Failed to fetch price for ${ticker}:`, error);
        return [ticker, 0] as [string, number];
      }
    });

    const prices = await Promise.all(pricePromises);
    const priceMap = new Map(prices);
    const pricesWithValues = Array.from(priceMap.entries()).filter(([_, price]) => price > 0);
    console.log(`[/api/scores] Fetched ${pricesWithValues.length}/${allTickers.length} prices successfully`);

    const scores = Array.from(result.scores.entries()).map(([ticker, score]) => {
      return {
        ticker,
        score: typeof score === 'number' ? score : (score as any).expectedReturn,
        components: typeof score === 'number' ? {} : (score as any).components,
        currentPrice: priceMap.get(ticker) || 0,
      };
    }).sort((a, b) => b.score - a.score);

    console.log(`[/api/scores] Returning top 5 scores:`, scores.slice(0, 5).map(s => ({ ticker: s.ticker, score: s.score, price: s.currentPrice })));
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/trades - Get trade history (user-specific)
 */
app.get('/api/trades', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);
    const output = agent.getAgentOutput();
    res.json(output.trades);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/analyze - Run analysis on watchlist (user-specific)
 */
app.post('/api/analyze', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);
    const { watchlist } = req.body;

    const result = await agent.analyzeWatchlist(watchlist || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']);

    res.json({
      scores: Array.from(result.scores.entries()).map(([ticker, score]) => ({
        ticker,
        score: typeof score === 'number' ? score : (score as any).expectedReturn,
        components: typeof score === 'number' ? {} : (score as any).components,
      })),
      rotationDecisions: result.rotationDecisions,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/execute - Execute rotation decisions (user-specific)
 */
app.post('/api/execute', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const agent = await userService.getUserAgent(userId);

    // Build comprehensive ticker list: Top 25 + Watchlist + Owned
    const top25 = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
      'BRK.B', 'V', 'JNJ', 'WMT', 'JPM', 'MA', 'PG',
      'UNH', 'HD', 'DIS', 'BAC', 'ADBE', 'CRM', 'NFLX',
      'CSCO', 'PEP', 'TMO'
    ];

    const watchlists = await userService.getUserWatchlists(userId);
    const defaultWatchlist = watchlists.find(w => w.name === 'default');
    const watchlistTickers = defaultWatchlist?.tickers || [];

    const positions = agent.getPositions();
    const ownedTickers = positions.map((p: any) => p.ticker);

    const allTickers = [...new Set([...top25, ...watchlistTickers, ...ownedTickers])];

    await agent.runTradingPass(allTickers);

    const output = agent.getAgentOutput();
    res.json({
      portfolio: {
        totalValue: output.performance.totalValue,
        cash: output.performance.cash,
        unrealizedPnL: output.performance.unrealizedPnL,
        unrealizedPnLPercent: output.performance.unrealizedPnLPercent,
      },
      trades: output.trades.slice(-10), // Last 10 trades
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/user/profile - Get user profile
 */
app.get('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const profile = await userService.getUserProfile(userId);

    if (!profile) {
      return res.json({
        user_id: userId,
        initial_capital: 10000,
        settings: {},
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * PUT /api/user/profile - Update user profile
 */
app.put('/api/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, full_name, initial_capital, settings } = req.body;

    await userService.upsertUserProfile(userId, {
      email,
      full_name,
      initial_capital,
      settings,
    });

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/user/watchlists - Get all user watchlists
 */
app.get('/api/user/watchlists', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const watchlists = await userService.getUserWatchlists(userId);
    res.json(watchlists);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/user/watchlists - Save/update a watchlist
 */
app.post('/api/user/watchlists', requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { name, tickers } = req.body;

    if (!name || !Array.isArray(tickers)) {
      return res.status(400).json({ error: 'Invalid watchlist data' });
    }

    await userService.saveWatchlist(userId, name, tickers);
    res.json({ success: true, message: 'Watchlist saved' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker - Get comprehensive market data for a ticker
 */
app.get('/api/market/:ticker', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const analysis = await finnhubService.getTickerAnalysis(ticker.toUpperCase());

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/recommendations - Get analyst recommendations
 */
app.get('/api/market/:ticker/recommendations', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const recommendations = await finnhubService.getRecommendations(ticker.toUpperCase());

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/price-target - Get analyst price target
 */
app.get('/api/market/:ticker/price-target', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const priceTarget = await finnhubService.getPriceTarget(ticker.toUpperCase());

    res.json(priceTarget);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/news - Get company news
 */
app.get('/api/market/:ticker/news', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const news = await finnhubService.getNews(ticker.toUpperCase());

    res.json(news);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/earnings - Get earnings data
 */
app.get('/api/market/:ticker/earnings', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const earnings = await finnhubService.getEarningsSurprises(ticker.toUpperCase());

    res.json(earnings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/politician-trades - Get politician trades for ticker
 */
app.get('/api/market/:ticker/politician-trades', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const { PoliticianTradesDatabase } = await import('../services/politician-trades-db.js');
    const tradesDb = new PoliticianTradesDatabase(process.env.DATABASE_URL!);

    const trades = await tradesDb.getTradesForTicker(ticker.toUpperCase(), 10);
    res.json(trades);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/politician/:name/trades - Get trades by politician name
 */
app.get('/api/politician/:name/trades', requireAuth, async (req, res) => {
  try {
    const { name } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const { PoliticianTradesDatabase } = await import('../services/politician-trades-db.js');
    const tradesDb = new PoliticianTradesDatabase(process.env.DATABASE_URL!);

    const trades = await tradesDb.getTradesByPolitician(name, limit);
    res.json({ trades });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/indicators - Get technical indicators
 */
app.get('/api/market/:ticker/indicators', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const { MarketData } = await import('../data/market_data.js');
    const { TechnicalIndicatorsService } = await import('../services/technical-indicators.js');

    const marketData = new MarketData();
    const indicatorsService = new TechnicalIndicatorsService();

    // Get 100 days of historical data for indicator calculation
    const candleData = await marketData.fetchCandles(ticker.toUpperCase(), 100);

    // Transform to price data format
    const priceData = candleData.dates.map((date, i) => ({
      timestamp: date.getTime(),
      open: candleData.prices[i],
      high: candleData.prices[i],
      low: candleData.prices[i],
      close: candleData.prices[i],
      volume: candleData.volumes[i]
    }));

    const indicators = indicatorsService.calculateAllIndicators(priceData);
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/chart - Get historical price data
 */
app.get('/api/market/:ticker/chart', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;
    const { timeframe = '1M' } = req.query;

    // Import market data service
    const { MarketData } = await import('../data/market_data.js');
    const marketData = new MarketData();

    // Calculate days based on timeframe
    let days: number;
    switch (timeframe) {
      case '1D': // Intraday (Note: yahoo-finance2 doesn't support intraday, using 5 days)
        days = 5;
        break;
      case '1W': // 1 week
        days = 7;
        break;
      case '1M': // 1 month
        days = 30;
        break;
      case '3M': // 3 months
        days = 90;
        break;
      case '1Y': // 1 year
        days = 365;
        break;
      default:
        days = 30;
    }

    const candleData = await marketData.fetchCandles(ticker.toUpperCase(), days);

    // Transform CandleData to array of candle objects for chart
    const candles = candleData.dates.map((date, i) => ({
      timestamp: date.getTime(),
      open: candleData.prices[i],
      high: candleData.prices[i],
      low: candleData.prices[i],
      close: candleData.prices[i],
      volume: candleData.volumes[i]
    }));

    res.json(candles);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/market/:ticker/snapshot - Get latest stock data snapshot (timeseries)
 * Returns real-time comprehensive stock data including prices, analyst data, news, earnings, etc.
 */
app.get('/api/market/:ticker/snapshot', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;

    // If ingestion service is available, get from timeseries database
    if (stockDataIngestionService) {
      let snapshot = await stockDataIngestionService.getLatestSnapshot(ticker.toUpperCase());

      // If no snapshot exists or it's older than 15 minutes, ingest fresh data
      if (!snapshot || (new Date().getTime() - snapshot.timestamp.getTime()) > 15 * 60 * 1000) {
        snapshot = await stockDataIngestionService.ingestStockData(ticker.toUpperCase());
      }

      return res.json(snapshot);
    }

    // Fallback: fetch fresh data directly from Finnhub
    const analysis = await finnhubService.getTickerAnalysis(ticker.toUpperCase());

    // Get current price
    const candleData = await marketData.fetchCandles(ticker.toUpperCase(), 5);
    const currentPrice = candleData.prices[candleData.prices.length - 1] || 0;
    const previousPrice = candleData.prices[candleData.prices.length - 2] || currentPrice;
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;

    // Build snapshot
    const snapshot = {
      ticker: ticker.toUpperCase(),
      timestamp: new Date(),
      currentPrice,
      priceChange,
      priceChangePercent,
      recommendations: analysis.recommendations[0] ? {
        strongBuy: analysis.recommendations[0].strongBuy,
        buy: analysis.recommendations[0].buy,
        hold: analysis.recommendations[0].hold,
        sell: analysis.recommendations[0].sell,
        strongSell: analysis.recommendations[0].strongSell,
      } : undefined,
      priceTarget: analysis.priceTarget,
      metrics: analysis.metrics,
      news: analysis.news.slice(0, 10),
      earnings: analysis.earnings,
      catalysts: analysis.catalysts,
      sentiment: analysis.sentiment,
    };

    res.json(snapshot);
  } catch (error) {
    console.error(`Failed to get snapshot for ${req.params.ticker}:`, error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/market/:ticker/ingest - Manually trigger data ingestion for a ticker
 */
app.post('/api/market/:ticker/ingest', requireAuth, async (req, res) => {
  try {
    const { ticker } = req.params;

    if (!stockDataIngestionService) {
      return res.status(503).json({ error: 'Stock data ingestion service not available' });
    }

    const snapshot = await stockDataIngestionService.ingestStockData(ticker.toUpperCase());
    res.json({ success: true, snapshot });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/chat - Ask questions about portfolio with RAG
 */
app.post('/api/chat', async (req, res) => {
  try {
    if (!chatService) {
      return res.status(503).json({
        error: 'Chat service not available. Please configure Azure OpenAI environment variables.',
      });
    }

    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Initialize RAG if first time
    if (!chatService['qaChain']) {
      await chatService.initialize();
    }

    // Get answer using RAG
    const result = await chatService.ask(question);

    res.json({
      answer: result.answer,
      sources: result.sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/chat/suggestions - Get suggested questions
 */
app.get('/api/chat/suggestions', (req, res) => {
  try {
    if (!chatService) {
      return res.json({ suggestions: [] });
    }

    const suggestions = chatService.getSuggestedQuestions();
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/backtest - Run backtest simulation
 */
app.post('/api/backtest', requireAuth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      initialCapital = 10000,
      rebalanceFrequency = 'weekly',
      watchlist,
      maxPositions = 5,
      positionSizePercent = 20,
      stopLossPercent,
      takeProfitPercent,
    } = req.body;

    if (!startDate || !endDate || !watchlist || !Array.isArray(watchlist)) {
      return res.status(400).json({
        error: 'Missing required fields: startDate, endDate, watchlist',
      });
    }

    const { BacktestingService } = await import('../services/backtesting-service.js');
    const backtestingService = new BacktestingService();

    const result = await backtestingService.runBacktest({
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      initialCapital,
      rebalanceFrequency,
      watchlist,
      maxPositions,
      positionSizePercent,
      stopLossPercent,
      takeProfitPercent,
    });

    res.json(result);
  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/backtest/compare - Compare multiple backtest strategies
 */
app.post('/api/backtest/compare', requireAuth, async (req, res) => {
  try {
    const { configs } = req.body;

    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        error: 'configs array is required',
      });
    }

    const { BacktestingService } = await import('../services/backtesting-service.js');
    const backtestingService = new BacktestingService();

    const parsedConfigs = configs.map((config: any) => ({
      ...config,
      startDate: new Date(config.startDate),
      endDate: new Date(config.endDate),
    }));

    const results = await backtestingService.compareStrategies(parsedConfigs);

    res.json(results);
  } catch (error) {
    console.error('Backtest compare error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\nPortfolio Management System`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Status: Running`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
