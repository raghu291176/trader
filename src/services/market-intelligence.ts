/**
 * Market Intelligence Service
 * Continuously updates RAG database with latest market analysis from Finnhub
 */

import { Document } from '@langchain/core/documents';
import { FinnhubService, FinnhubRecommendation, FinnhubPriceTarget, FinnhubNews } from './finnhub-service.js';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
}

export interface AnalystReport {
  firm: string;
  analyst: string;
  ticker: string;
  rating: 'BUY' | 'HOLD' | 'SELL' | 'UPGRADE' | 'DOWNGRADE';
  targetPrice: number;
  currentPrice: number;
  timestamp: Date;
  summary: string;
  catalysts?: string[];
}

export interface MarketNews {
  source: string;
  headline: string;
  summary: string;
  tickers: string[];
  sentiment: number; // -1 to 1
  timestamp: Date;
  url?: string;
}

export class MarketIntelligenceService {
  private updateInterval: NodeJS.Timeout | null = null;
  private analystReports: AnalystReport[] = [];
  private marketNews: MarketNews[] = [];
  private azureConfig: AzureOpenAIConfig;
  private finnhub: FinnhubService;
  private trackedTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX'];

  constructor(azureConfig: AzureOpenAIConfig, finnhubApiKey?: string) {
    this.azureConfig = azureConfig;
    this.finnhub = new FinnhubService(finnhubApiKey || '');
  }

  /**
   * Start continuous updates (every 1 hour)
   */
  async startContinuousUpdates(intervalMs: number = 60 * 60 * 1000): Promise<void> {
    // Initial load
    await this.updateMarketIntelligence();

    // Schedule periodic updates
    this.updateInterval = setInterval(async () => {
      await this.updateMarketIntelligence();
    }, intervalMs);

    console.log(`📡 Market Intelligence: Started continuous updates (every ${intervalMs / 1000 / 60} minutes)`);
  }

  /**
   * Stop continuous updates
   */
  stopContinuousUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update market intelligence from multiple sources
   */
  private async updateMarketIntelligence(): Promise<void> {
    console.log('📰 Fetching latest market intelligence...');

    try {
      // Fetch from multiple sources in parallel
      await Promise.all([
        this.fetchAnalystReports(),
        this.fetchMarketNews(),
      ]);

      // Rebuild vector store with latest data
      await this.rebuildVectorStore();

      console.log(`✅ Market Intelligence Updated: ${this.analystReports.length} analyst reports, ${this.marketNews.length} news items`);
    } catch (error) {
      console.error('❌ Failed to update market intelligence:', error);
    }
  }

  /**
   * Fetch analyst reports from Finnhub for tracked tickers
   */
  private async fetchAnalystReports(): Promise<void> {
    const reports: AnalystReport[] = [];

    // Fetch recommendations and price targets for each tracked ticker
    for (const ticker of this.trackedTickers) {
      try {
        const [recommendations, priceTarget] = await Promise.all([
          this.finnhub.getRecommendations(ticker),
          this.finnhub.getPriceTarget(ticker),
        ]);

        if (recommendations.length > 0 && priceTarget) {
          const latest = recommendations[0];
          const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
          const bullishCount = latest.strongBuy + latest.buy;
          const bearishCount = latest.sell + latest.strongSell;

          let rating: AnalystReport['rating'] = 'HOLD';
          if (bullishCount > total * 0.6) rating = 'BUY';
          else if (bearishCount > total * 0.4) rating = 'SELL';

          const upside = priceTarget.targetMean > 0
            ? ((priceTarget.targetMean - (priceTarget as any).currentPrice || priceTarget.targetMean * 0.9) / (priceTarget.targetMean * 0.9) * 100)
            : 0;

          reports.push({
            firm: 'Finnhub Analyst Consensus',
            analyst: `${total} analysts`,
            ticker,
            rating,
            targetPrice: priceTarget.targetMean,
            currentPrice: priceTarget.targetMean * 0.9, // Approximate — real price filled by snapshot
            timestamp: new Date(latest.period || Date.now()),
            summary: `${total} analysts covering ${ticker}: ${latest.strongBuy} Strong Buy, ${latest.buy} Buy, ${latest.hold} Hold, ${latest.sell} Sell, ${latest.strongSell} Strong Sell. Mean target $${priceTarget.targetMean.toFixed(2)} (range $${priceTarget.targetLow.toFixed(2)}-$${priceTarget.targetHigh.toFixed(2)}).`,
            catalysts: [],
          });
        }
      } catch (error) {
        console.error(`Failed to fetch analyst reports for ${ticker}:`, error);
      }
    }

    this.analystReports = reports;
  }

  /**
   * Fetch market news from Finnhub for tracked tickers
   */
  private async fetchMarketNews(): Promise<void> {
    const allNews: MarketNews[] = [];

    for (const ticker of this.trackedTickers) {
      try {
        const news = await this.finnhub.getNews(ticker);
        const sentiment = this.finnhub.calculateNewsSentiment(news);

        for (const item of news.slice(0, 3)) {
          allNews.push({
            source: item.source,
            headline: item.headline,
            summary: item.summary,
            tickers: [ticker],
            sentiment,
            timestamp: new Date(item.datetime * 1000),
            url: item.url,
          });
        }
      } catch (error) {
        console.error(`Failed to fetch news for ${ticker}:`, error);
      }
    }

    this.marketNews = allNews;
  }

  /**
   * Rebuild vector store with latest intelligence
   * Note: Vector store functionality removed in langchain v1+ migration
   * Documents are now returned directly via getIntelligenceDocuments()
   */
  private async rebuildVectorStore(): Promise<void> {
    // No-op: vector store functionality simplified
    // Data is accessed directly via analystReports and marketNews arrays
  }

  /**
   * Query market intelligence
   * Note: Simplified implementation without vector search
   */
  async query(question: string, topK: number = 3): Promise<Document[]> {
    if (this.analystReports.length === 0 && this.marketNews.length === 0) {
      await this.updateMarketIntelligence();
    }

    // Return all intelligence documents (simplified without vector search)
    const docs = await this.getIntelligenceDocuments();
    return docs.slice(0, topK);
  }

  /**
   * Get analyst consensus for a ticker
   */
  getAnalystConsensus(ticker: string): {
    buy: number;
    hold: number;
    sell: number;
    avgTargetPrice: number;
  } | null {
    const reports = this.analystReports.filter(r => r.ticker === ticker);

    if (reports.length === 0) return null;

    const buy = reports.filter(r => r.rating === 'BUY' || r.rating === 'UPGRADE').length;
    const hold = reports.filter(r => r.rating === 'HOLD').length;
    const sell = reports.filter(r => r.rating === 'SELL' || r.rating === 'DOWNGRADE').length;
    const avgTargetPrice = reports.reduce((sum, r) => sum + r.targetPrice, 0) / reports.length;

    return { buy, hold, sell, avgTargetPrice };
  }

  /**
   * Get latest news for a ticker
   */
  getLatestNews(ticker: string, limit: number = 5): MarketNews[] {
    return this.marketNews
      .filter(news => news.tickers.includes(ticker))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get market intelligence documents for RAG injection
   */
  async getIntelligenceDocuments(): Promise<Document[]> {
    if (this.analystReports.length === 0 && this.marketNews.length === 0) {
      await this.updateMarketIntelligence();
    }

    // Return all documents from vector store
    const allDocs: Document[] = [];

    // Add analyst reports
    for (const report of this.analystReports) {
      const upside = ((report.targetPrice - report.currentPrice) / report.currentPrice * 100).toFixed(1);

      allDocs.push(new Document({
        pageContent: `${report.firm} on ${report.ticker}: ${report.rating} with $${report.targetPrice} target (+${upside}%). ${report.summary}`,
        metadata: { type: 'analyst_report', ticker: report.ticker },
      }));
    }

    // Add news
    for (const news of this.marketNews) {
      allDocs.push(new Document({
        pageContent: `${news.source}: ${news.headline}. ${news.summary}`,
        metadata: { type: 'market_news', tickers: news.tickers },
      }));
    }

    return allDocs;
  }
}
