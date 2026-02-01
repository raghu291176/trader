/**
 * Market Intelligence Service
 * Continuously updates RAG database with latest market analysis from major firms
 */

import { Document } from 'langchain/document';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';

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
  private vectorStore: MemoryVectorStore | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private analystReports: AnalystReport[] = [];
  private marketNews: MarketNews[] = [];
  private azureConfig: AzureOpenAIConfig;

  constructor(azureConfig: AzureOpenAIConfig) {
    this.azureConfig = azureConfig;
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
        this.fetchSectorAnalysis(),
      ]);

      // Rebuild vector store with latest data
      await this.rebuildVectorStore();

      console.log(`✅ Market Intelligence Updated: ${this.analystReports.length} analyst reports, ${this.marketNews.length} news items`);
    } catch (error) {
      console.error('❌ Failed to update market intelligence:', error);
    }
  }

  /**
   * Fetch analyst reports from major firms
   * Sources: Bloomberg, Goldman Sachs, Morgan Stanley, JP Morgan, etc.
   */
  private async fetchAnalystReports(): Promise<void> {
    // TODO: Integrate with real analyst data APIs
    // For MVP, we'll use placeholder data structure

    const mockReports: AnalystReport[] = [
      {
        firm: 'Goldman Sachs',
        analyst: 'John Doe',
        ticker: 'NVDA',
        rating: 'BUY',
        targetPrice: 850,
        currentPrice: 725,
        timestamp: new Date(),
        summary: 'Strong AI demand driving revenue growth. Raised target from $800 to $850 on datacenter momentum.',
        catalysts: ['AI chip demand', 'Datacenter expansion', 'New product launches'],
      },
      {
        firm: 'Morgan Stanley',
        analyst: 'Jane Smith',
        ticker: 'TSLA',
        rating: 'UPGRADE',
        targetPrice: 320,
        currentPrice: 275,
        timestamp: new Date(),
        summary: 'Upgraded to Overweight. FSD adoption accelerating, energy storage business underappreciated.',
        catalysts: ['FSD licensing revenue', 'Energy storage growth', 'Cybertruck ramp'],
      },
    ];

    this.analystReports = mockReports;
  }

  /**
   * Fetch market news with sentiment analysis
   * Sources: Bloomberg, Reuters, CNBC, WSJ, MarketWatch
   */
  private async fetchMarketNews(): Promise<void> {
    // TODO: Integrate with news APIs (NewsAPI, Finnhub, AlphaVantage)
    // For MVP, placeholder structure

    const mockNews: MarketNews[] = [
      {
        source: 'Bloomberg',
        headline: 'Tech Stocks Rally on Strong Q4 Earnings',
        summary: 'Mega-cap tech names surged after beating earnings estimates, with NVDA up 7% and MSFT up 4%.',
        tickers: ['NVDA', 'MSFT', 'GOOGL', 'META'],
        sentiment: 0.8,
        timestamp: new Date(),
      },
      {
        source: 'Reuters',
        headline: 'Fed Signals Potential Rate Cuts in 2024',
        summary: 'Federal Reserve indicated openness to rate cuts if inflation continues to moderate, boosting growth stocks.',
        tickers: ['SPY', 'QQQ'],
        sentiment: 0.6,
        timestamp: new Date(),
      },
    ];

    this.marketNews = mockNews;
  }

  /**
   * Fetch sector rotation analysis
   */
  private async fetchSectorAnalysis(): Promise<void> {
    // TODO: Fetch sector rotation data from major research firms
    // Track institutional money flow between sectors
  }

  /**
   * Rebuild vector store with latest intelligence
   */
  private async rebuildVectorStore(): Promise<void> {
    const embeddings = new OpenAIEmbeddings({
      configuration: {
        apiKey: this.azureConfig.apiKey,
        baseURL: `${this.azureConfig.endpoint}/openai/deployments/${this.azureConfig.embeddingDeploymentName || 'text-embedding-ada-002'}`,
        defaultQuery: { 'api-version': this.azureConfig.apiVersion || '2024-02-15-preview' },
        defaultHeaders: { 'api-key': this.azureConfig.apiKey },
      },
    } as any);
    const documents: Document[] = [];

    // Add analyst reports as documents
    for (const report of this.analystReports) {
      const upside = ((report.targetPrice - report.currentPrice) / report.currentPrice * 100).toFixed(1);

      documents.push(new Document({
        pageContent: `${report.firm} Analyst Report on ${report.ticker}:
Analyst: ${report.analyst}
Rating: ${report.rating}
Target Price: $${report.targetPrice} (${upside}% upside)
Current Price: $${report.currentPrice}
Date: ${report.timestamp.toISOString()}
Summary: ${report.summary}
Key Catalysts: ${report.catalysts?.join(', ') || 'N/A'}`,
        metadata: {
          type: 'analyst_report',
          firm: report.firm,
          ticker: report.ticker,
          rating: report.rating,
          targetPrice: report.targetPrice,
          timestamp: report.timestamp.toISOString(),
        },
      }));
    }

    // Add market news as documents
    for (const news of this.marketNews) {
      documents.push(new Document({
        pageContent: `${news.source} - ${news.headline}
${news.summary}
Tickers Mentioned: ${news.tickers.join(', ')}
Sentiment: ${news.sentiment > 0 ? 'Positive' : news.sentiment < 0 ? 'Negative' : 'Neutral'} (${news.sentiment.toFixed(2)})
Published: ${news.timestamp.toISOString()}`,
        metadata: {
          type: 'market_news',
          source: news.source,
          tickers: news.tickers,
          sentiment: news.sentiment,
          timestamp: news.timestamp.toISOString(),
        },
      }));
    }

    // Create vector store
    this.vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
  }

  /**
   * Query market intelligence
   */
  async query(question: string, topK: number = 3): Promise<Document[]> {
    if (!this.vectorStore) {
      await this.updateMarketIntelligence();
    }

    return await this.vectorStore!.similaritySearch(question, topK);
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
    if (!this.vectorStore) {
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
