/**
 * Express API Server for Portfolio Rotation Agent
 * Provides REST endpoints for dashboard UI
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserService } from '../services/user-service.js';
import { clerkMiddleware, requireAuth as clerkRequireAuth } from '@clerk/express';
import dotenv from 'dotenv';

// Simple auth helper
function getUserId(req: any): string {
  return req.auth?.userId || 'anonymous';
}

const requireAuth = clerkRequireAuth() as any;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize UserService for multi-user support
const userService = new UserService(process.env.DATABASE_URL!);

// TODO: Refactor ChatService to support per-user instances
// For now, chat service is disabled in multi-user mode
const chatService = null;

// API Endpoints

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

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

    // Get user's default watchlist or use default
    const watchlists = await userService.getUserWatchlists(userId);
    const defaultWatchlist = watchlists.find(w => w.name === 'default');
    const watchlist = defaultWatchlist?.tickers ||
      ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'INTC', 'CRM'];

    const result = await agent.analyzeWatchlist(watchlist);

    const scores = Array.from(result.scores.entries()).map(([ticker, score]) => ({
      ticker,
      score: typeof score === 'number' ? score : (score as any).expectedReturn,
      components: typeof score === 'number' ? {} : (score as any).components,
    })).sort((a, b) => b.score - a.score);

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

    // Get user's default watchlist
    const watchlists = await userService.getUserWatchlists(userId);
    const defaultWatchlist = watchlists.find(w => w.name === 'default');
    const watchlist = defaultWatchlist?.tickers ||
      ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'INTC', 'CRM'];

    await agent.runTradingPass(watchlist);

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

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Portfolio Rotation Agent API - Multi-User Edition`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔌 API Endpoint: http://localhost:${PORT}/api`);
  console.log(`🔐 Authentication: Clerk (Multi-User Support)`);
  console.log(`💾 Database: Neon PostgreSQL with pgvector`);
  console.log(`💬 Chat with RAG: ${chatService ? 'Enabled' : 'Coming soon (per-user instances)'}`);
  console.log(`\n👨‍👩‍👧‍👦 Each user gets their own portfolio`);
  console.log(`📈 Ready for your family to trade!\n`);
});

export default app;
