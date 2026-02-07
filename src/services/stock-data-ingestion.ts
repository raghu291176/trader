/**
 * Stock Data Ingestion Service
 * Fetches comprehensive stock data from Finnhub and stores it in RAG system
 * with timeseries structure for historical tracking
 */

import { Document } from '@langchain/core/documents';
import { FinnhubService } from './finnhub-service.js';
import { PgVectorStore } from './pgvector-store.js';
import { neon } from '@neondatabase/serverless';

export interface StockDataSnapshot {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;

  // Analyst data
  recommendations?: {
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };

  priceTarget?: {
    targetHigh: number;
    targetMean: number;
    targetLow: number;
  };

  // Fundamental metrics
  metrics?: {
    '52WeekHigh': number;
    '52WeekLow': number;
    marketCapitalization: number;
    peBasicExclExtraTTM: number;
  };

  // Technical indicators
  technicalIndicators?: {
    rsi: { value: number; signal: string };
    macd: { macd: number; signal: number; histogram: number; trend: string };
    bollinger: { upper: number; middle: number; lower: number; percentB: number };
    stochastic: { k: number; d: number; signal: string };
    trend: string;
    strength: number;
  };

  // Recent news
  news?: Array<{
    source: string;
    headline: string;
    summary: string;
    datetime: number;
    sentiment: number;
  }>;

  // Recent earnings
  earnings?: Array<{
    period: string;
    quarter: number;
    year: number;
    actual: number;
    estimate: number;
    surprise: number;
    surprisePercent: number;
  }>;

  // Catalysts
  catalysts?: Array<{
    type: string;
    description: string;
    impact: string;
    date: Date;
  }>;

  sentiment: number;
}

export class StockDataIngestionService {
  private finnhub: FinnhubService;
  private vectorStore: PgVectorStore;
  private sql: ReturnType<typeof neon>;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private twelveData: any;
  private fmpService: any;

  constructor(
    finnhubApiKey: string,
    databaseUrl: string,
    azureConfig: {
      apiKey: string;
      endpoint: string;
      deploymentName: string;
      embeddingDeploymentName?: string;
      apiVersion?: string;
    },
    options?: { twelveDataService?: any; fmpService?: any }
  ) {
    this.finnhub = new FinnhubService(finnhubApiKey);
    this.vectorStore = new PgVectorStore(databaseUrl, azureConfig);
    this.sql = neon(databaseUrl);
    this.twelveData = options?.twelveDataService || null;
    this.fmpService = options?.fmpService || null;
  }

  /**
   * Start continuous data ingestion for a list of tickers
   */
  async startContinuousIngestion(tickers: string[], intervalMinutes: number = 15): Promise<void> {
    console.log(`📊 Starting continuous ingestion for ${tickers.length} tickers (every ${intervalMinutes} minutes)`);

    // Initial ingestion (non-fatal per ticker so server still starts)
    for (const ticker of tickers) {
      try {
        await this.ingestStockData(ticker);
      } catch (error) {
        console.warn(`⚠️  Initial ingestion failed for ${ticker}:`, (error as Error).message);
      }
    }

    // Schedule periodic updates
    for (const ticker of tickers) {
      const interval = setInterval(async () => {
        try {
          await this.ingestStockData(ticker);
        } catch (error) {
          console.warn(`⚠️  Periodic ingestion failed for ${ticker}:`, (error as Error).message);
        }
      }, intervalMinutes * 60 * 1000);

      this.updateIntervals.set(ticker, interval);
    }
  }

  /**
   * Stop continuous ingestion
   */
  stopContinuousIngestion(): void {
    for (const [ticker, interval] of this.updateIntervals.entries()) {
      clearInterval(interval);
      console.log(`🛑 Stopped ingestion for ${ticker}`);
    }
    this.updateIntervals.clear();
  }

  /**
   * Ingest comprehensive stock data for a single ticker
   */
  async ingestStockData(ticker: string): Promise<StockDataSnapshot> {
    console.log(`📥 Ingesting data for ${ticker}...`);

    try {
      // Fetch all data from Finnhub
      const analysis = await this.finnhub.getTickerAnalysis(ticker);

      // Get current price from Yahoo Finance or other source
      const priceData = await this.fetchCurrentPrice(ticker);

      // Build comprehensive snapshot
      const snapshot: StockDataSnapshot = {
        ticker,
        timestamp: new Date(),
        currentPrice: priceData.currentPrice,
        priceChange: priceData.priceChange,
        priceChangePercent: priceData.priceChangePercent,
        recommendations: analysis.recommendations[0] ? {
          strongBuy: analysis.recommendations[0].strongBuy,
          buy: analysis.recommendations[0].buy,
          hold: analysis.recommendations[0].hold,
          sell: analysis.recommendations[0].sell,
          strongSell: analysis.recommendations[0].strongSell,
        } : undefined,
        priceTarget: analysis.priceTarget ? {
          targetHigh: analysis.priceTarget.targetHigh,
          targetMean: analysis.priceTarget.targetMean,
          targetLow: analysis.priceTarget.targetLow,
        } : undefined,
        metrics: analysis.metrics ? {
          '52WeekHigh': analysis.metrics['52WeekHigh'],
          '52WeekLow': analysis.metrics['52WeekLow'],
          marketCapitalization: analysis.metrics.marketCapitalization,
          peBasicExclExtraTTM: analysis.metrics.peBasicExclExtraTTM,
        } : undefined,
        news: analysis.news.slice(0, 10).map(n => ({
          source: n.source,
          headline: n.headline,
          summary: n.summary,
          datetime: n.datetime,
          sentiment: 0, // Will be calculated
        })),
        earnings: analysis.earnings.slice(0, 4),
        catalysts: analysis.catalysts,
        sentiment: analysis.sentiment,
      };

      // Populate technical indicators from Twelve Data
      if (this.twelveData) {
        try {
          snapshot.technicalIndicators = await this.twelveData.getIndicatorBundle(ticker);
        } catch (error) {
          console.warn(`Twelve Data indicators skipped for ${ticker}:`, (error as Error).message);
        }
      }

      // Enrich price target from FMP if Finnhub returned null (premium-only on free tier)
      if (!snapshot.priceTarget && this.fmpService) {
        try {
          const consensus = await this.fmpService.getPriceTargetConsensus(ticker);
          if (consensus) {
            snapshot.priceTarget = {
              targetHigh: consensus.targetHigh,
              targetMean: consensus.targetConsensus,
              targetLow: consensus.targetLow,
            };
          }
        } catch (error) {
          console.warn(`FMP price target skipped for ${ticker}:`, (error as Error).message);
        }
      }

      // Store in database as timeseries
      await this.storeSnapshot(snapshot);

      // Create embeddings for RAG (non-fatal — app works without embeddings)
      try {
        await this.createEmbeddings(snapshot);
      } catch (embeddingError) {
        console.warn(`⚠️  Embeddings skipped for ${ticker} (check AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME):`, (embeddingError as Error).message);
      }

      console.log(`✅ Ingested data for ${ticker}`);
      return snapshot;
    } catch (error) {
      console.error(`❌ Failed to ingest data for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Fetch current price from Yahoo Finance or other source
   */
  private async fetchCurrentPrice(ticker: string): Promise<{
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
  }> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`
      );
      const data: any = await response.json();

      const quote = data.chart.result[0];
      const currentPrice = quote.meta.regularMarketPrice;
      const previousClose = quote.meta.chartPreviousClose;
      const priceChange = currentPrice - previousClose;
      const priceChangePercent = (priceChange / previousClose) * 100;

      return { currentPrice, priceChange, priceChangePercent };
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}:`, error);
      return { currentPrice: 0, priceChange: 0, priceChangePercent: 0 };
    }
  }

  /**
   * Store snapshot in timeseries database
   */
  private async storeSnapshot(snapshot: StockDataSnapshot): Promise<void> {
    try {
      await this.sql`
        INSERT INTO trader.stock_data_snapshots (
          ticker,
          timestamp,
          current_price,
          price_change,
          price_change_percent,
          recommendations,
          price_target,
          metrics,
          technical_indicators,
          news,
          earnings,
          catalysts,
          sentiment
        )
        VALUES (
          ${snapshot.ticker},
          ${snapshot.timestamp.toISOString()},
          ${snapshot.currentPrice},
          ${snapshot.priceChange},
          ${snapshot.priceChangePercent},
          ${JSON.stringify(snapshot.recommendations || null)}::jsonb,
          ${JSON.stringify(snapshot.priceTarget || null)}::jsonb,
          ${JSON.stringify(snapshot.metrics || null)}::jsonb,
          ${JSON.stringify(snapshot.technicalIndicators || null)}::jsonb,
          ${JSON.stringify(snapshot.news || [])}::jsonb,
          ${JSON.stringify(snapshot.earnings || [])}::jsonb,
          ${JSON.stringify(snapshot.catalysts || [])}::jsonb,
          ${snapshot.sentiment}
        )
        ON CONFLICT (ticker, timestamp)
        DO UPDATE SET
          current_price = EXCLUDED.current_price,
          price_change = EXCLUDED.price_change,
          price_change_percent = EXCLUDED.price_change_percent,
          recommendations = EXCLUDED.recommendations,
          price_target = EXCLUDED.price_target,
          metrics = EXCLUDED.metrics,
          news = EXCLUDED.news,
          earnings = EXCLUDED.earnings,
          catalysts = EXCLUDED.catalysts,
          sentiment = EXCLUDED.sentiment
      `;
    } catch (error) {
      console.error(`Failed to store snapshot for ${snapshot.ticker}:`, error);
    }
  }

  /**
   * Create embeddings for RAG system
   */
  private async createEmbeddings(snapshot: StockDataSnapshot): Promise<void> {
    const documents: Document[] = [];

    // Current price and performance
    documents.push(new Document({
      pageContent: `${snapshot.ticker} current price: $${snapshot.currentPrice.toFixed(2)} (${snapshot.priceChange >= 0 ? '+' : ''}${snapshot.priceChangePercent.toFixed(2)}%)`,
      metadata: {
        type: 'stock_price',
        ticker: snapshot.ticker,
        timestamp: snapshot.timestamp.toISOString(),
      },
    }));

    // Analyst recommendations
    if (snapshot.recommendations) {
      const total = snapshot.recommendations.strongBuy + snapshot.recommendations.buy +
                    snapshot.recommendations.hold + snapshot.recommendations.sell +
                    snapshot.recommendations.strongSell;
      const bullish = ((snapshot.recommendations.strongBuy + snapshot.recommendations.buy) / total) * 100;

      documents.push(new Document({
        pageContent: `${snapshot.ticker} analyst consensus: ${total} analysts, ${bullish.toFixed(0)}% bullish (${snapshot.recommendations.strongBuy} Strong Buy, ${snapshot.recommendations.buy} Buy, ${snapshot.recommendations.hold} Hold, ${snapshot.recommendations.sell} Sell, ${snapshot.recommendations.strongSell} Strong Sell)`,
        metadata: {
          type: 'analyst_consensus',
          ticker: snapshot.ticker,
          timestamp: snapshot.timestamp.toISOString(),
        },
      }));
    }

    // Price target
    if (snapshot.priceTarget) {
      const upside = ((snapshot.priceTarget.targetMean - snapshot.currentPrice) / snapshot.currentPrice) * 100;
      documents.push(new Document({
        pageContent: `${snapshot.ticker} analyst price target: $${snapshot.priceTarget.targetMean.toFixed(2)} (${upside >= 0 ? '+' : ''}${upside.toFixed(1)}% upside). Range: $${snapshot.priceTarget.targetLow.toFixed(2)} - $${snapshot.priceTarget.targetHigh.toFixed(2)}`,
        metadata: {
          type: 'price_target',
          ticker: snapshot.ticker,
          timestamp: snapshot.timestamp.toISOString(),
        },
      }));
    }

    // Recent news
    if (snapshot.news && snapshot.news.length > 0) {
      for (const newsItem of snapshot.news.slice(0, 5)) {
        documents.push(new Document({
          pageContent: `${snapshot.ticker} news from ${newsItem.source}: ${newsItem.headline}. ${newsItem.summary}`,
          metadata: {
            type: 'stock_news',
            ticker: snapshot.ticker,
            timestamp: new Date(newsItem.datetime * 1000).toISOString(),
          },
        }));
      }
    }

    // Recent earnings
    if (snapshot.earnings && snapshot.earnings.length > 0) {
      const latest = snapshot.earnings[0];
      documents.push(new Document({
        pageContent: `${snapshot.ticker} Q${latest.quarter} ${latest.year} earnings: Actual EPS $${latest.actual.toFixed(2)} vs Estimate $${latest.estimate.toFixed(2)} (${latest.surprise > 0 ? 'Beat' : 'Missed'} by ${Math.abs(latest.surprisePercent).toFixed(1)}%)`,
        metadata: {
          type: 'earnings',
          ticker: snapshot.ticker,
          timestamp: snapshot.timestamp.toISOString(),
        },
      }));
    }

    // Catalysts
    if (snapshot.catalysts && snapshot.catalysts.length > 0) {
      for (const catalyst of snapshot.catalysts) {
        documents.push(new Document({
          pageContent: `${snapshot.ticker} catalyst: ${catalyst.description} (${catalyst.impact} impact)`,
          metadata: {
            type: 'catalyst',
            ticker: snapshot.ticker,
            timestamp: catalyst.date.toISOString(),
          },
        }));
      }
    }

    // Financial metrics
    if (snapshot.metrics) {
      documents.push(new Document({
        pageContent: `${snapshot.ticker} metrics: Market Cap $${(snapshot.metrics.marketCapitalization / 1000).toFixed(2)}B, 52-Week Range $${snapshot.metrics['52WeekLow'].toFixed(2)} - $${snapshot.metrics['52WeekHigh'].toFixed(2)}, P/E Ratio ${snapshot.metrics.peBasicExclExtraTTM?.toFixed(2) || 'N/A'}`,
        metadata: {
          type: 'financial_metrics',
          ticker: snapshot.ticker,
          timestamp: snapshot.timestamp.toISOString(),
        },
      }));
    }

    // Store embeddings in pgvector
    await this.vectorStore.addDocuments(documents);
  }

  /**
   * Get latest snapshot for a ticker
   */
  async getLatestSnapshot(ticker: string): Promise<StockDataSnapshot | null> {
    try {
      const result = await this.sql`
        SELECT *
        FROM trader.stock_data_snapshots
        WHERE ticker = ${ticker}
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const rows = result as any[];
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        ticker: row.ticker,
        timestamp: new Date(row.timestamp),
        currentPrice: row.current_price,
        priceChange: row.price_change,
        priceChangePercent: row.price_change_percent,
        recommendations: row.recommendations,
        priceTarget: row.price_target,
        metrics: row.metrics,
        technicalIndicators: row.technical_indicators,
        news: row.news,
        earnings: row.earnings,
        catalysts: row.catalysts,
        sentiment: row.sentiment,
      };
    } catch (error) {
      console.error(`Failed to get latest snapshot for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get historical snapshots for a ticker
   */
  async getHistoricalSnapshots(
    ticker: string,
    from: Date,
    to: Date = new Date()
  ): Promise<StockDataSnapshot[]> {
    try {
      const result = await this.sql`
        SELECT *
        FROM trader.stock_data_snapshots
        WHERE ticker = ${ticker}
          AND timestamp >= ${from.toISOString()}
          AND timestamp <= ${to.toISOString()}
        ORDER BY timestamp DESC
      `;

      const rows = result as any[];
      return rows.map((row: any) => ({
        ticker: row.ticker,
        timestamp: new Date(row.timestamp),
        currentPrice: row.current_price,
        priceChange: row.price_change,
        priceChangePercent: row.price_change_percent,
        recommendations: row.recommendations,
        priceTarget: row.price_target,
        metrics: row.metrics,
        technicalIndicators: row.technical_indicators,
        news: row.news,
        earnings: row.earnings,
        catalysts: row.catalysts,
        sentiment: row.sentiment,
      }));
    } catch (error) {
      console.error(`Failed to get historical snapshots for ${ticker}:`, error);
      return [];
    }
  }
}
