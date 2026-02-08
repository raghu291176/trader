/**
 * Public Sources Search Service
 * Searches external public sources for financial information
 */

import { FinnhubService } from './finnhub-service.js';
import type { AlphaVantageService } from './alpha-vantage-service.js';
import type { FMPService } from './fmp-service.js';

export interface PublicSource {
  type: 'news' | 'sec_filing' | 'analyst_report' | 'social_media' | 'market_data';
  source: string;
  title: string;
  content: string;
  url?: string;
  timestamp: Date;
  relevance: number;
}

export class PublicSourcesSearchService {
  private finnhub: FinnhubService;
  private alphaVantage: AlphaVantageService | null;
  private fmpService: FMPService | null;

  constructor(finnhubApiKey: string, options?: { alphaVantageService?: AlphaVantageService; fmpService?: FMPService }) {
    this.finnhub = new FinnhubService(finnhubApiKey);
    this.alphaVantage = options?.alphaVantageService || null;
    this.fmpService = options?.fmpService || null;
  }

  /**
   * Search public sources for information related to a query
   */
  async search(query: string, ticker?: string): Promise<PublicSource[]> {
    const results: PublicSource[] = [];

    // If ticker is provided or detected in query, get ticker-specific data
    const detectedTicker = ticker || this.extractTicker(query);

    if (detectedTicker) {
      // Get latest news
      const news = await this.searchNews(detectedTicker);
      results.push(...news);

      // Get analyst reports/recommendations
      const analystData = await this.searchAnalystReports(detectedTicker);
      results.push(...analystData);

      // Get SEC filings
      const secFilings = await this.searchSECFilings(detectedTicker);
      results.push(...secFilings);

      // Get market data
      const marketData = await this.searchMarketData(detectedTicker);
      results.push(...marketData);
    } else {
      // General market search
      const generalNews = await this.searchGeneralNews(query);
      results.push(...generalNews);
    }

    // Sort by relevance and recency
    return results
      .sort((a, b) => {
        // Prioritize recent content
        const timeScore = b.timestamp.getTime() - a.timestamp.getTime();
        const relevanceScore = (b.relevance - a.relevance) * 1000000;
        return relevanceScore + timeScore;
      })
      .slice(0, 10); // Top 10 most relevant results
  }

  /**
   * Search for news articles
   */
  private async searchNews(ticker: string): Promise<PublicSource[]> {
    try {
      const news = await this.finnhub.getNews(ticker);

      return news.slice(0, 5).map(item => ({
        type: 'news' as const,
        source: item.source,
        title: item.headline,
        content: `${item.headline}. ${item.summary}`,
        url: item.url,
        timestamp: new Date(item.datetime * 1000),
        relevance: 0.8, // High relevance for news
      }));
    } catch (error) {
      console.error(`Failed to search news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search for analyst reports and recommendations
   */
  private async searchAnalystReports(ticker: string): Promise<PublicSource[]> {
    try {
      const [recommendations, priceTarget] = await Promise.all([
        this.finnhub.getRecommendations(ticker),
        this.finnhub.getPriceTarget(ticker),
      ]);

      const results: PublicSource[] = [];

      // Latest recommendation
      if (recommendations.length > 0) {
        const latest = recommendations[0];
        const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
        const bullish = ((latest.strongBuy + latest.buy) / total) * 100;

        results.push({
          type: 'analyst_report',
          source: 'Finnhub Analyst Consensus',
          title: `${ticker} Analyst Recommendations`,
          content: `Current analyst consensus for ${ticker}: ${total} analysts covering the stock, with ${bullish.toFixed(0)}% bullish ratings (${latest.strongBuy} Strong Buy, ${latest.buy} Buy, ${latest.hold} Hold, ${latest.sell} Sell, ${latest.strongSell} Strong Sell). Period: ${latest.period}`,
          timestamp: new Date(),
          relevance: 0.9,
        });
      }

      // Price target (Finnhub first, FMP fallback)
      if (priceTarget) {
        results.push({
          type: 'analyst_report',
          source: 'Analyst Price Targets',
          title: `${ticker} Price Target`,
          content: `Analyst price targets for ${ticker}: Mean target $${priceTarget.targetMean.toFixed(2)}, ranging from $${priceTarget.targetLow.toFixed(2)} (low) to $${priceTarget.targetHigh.toFixed(2)} (high). Last updated: ${priceTarget.lastUpdated}`,
          timestamp: new Date(priceTarget.lastUpdated),
          relevance: 0.85,
        });
      } else if (this.fmpService) {
        try {
          const fmpTarget = await this.fmpService.getPriceTargetConsensus(ticker);
          if (fmpTarget) {
            results.push({
              type: 'analyst_report',
              source: 'FMP Analyst Price Targets',
              title: `${ticker} Price Target`,
              content: `Analyst price targets for ${ticker}: Consensus $${fmpTarget.targetConsensus.toFixed(2)}, ranging from $${fmpTarget.targetLow.toFixed(2)} (low) to $${fmpTarget.targetHigh.toFixed(2)} (high).`,
              timestamp: new Date(),
              relevance: 0.85,
            });
          }
        } catch { /* skip */ }
      }

      return results;
    } catch (error) {
      console.error(`Failed to search analyst reports for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search SEC filings (placeholder - would integrate with SEC EDGAR API)
   */
  private async searchSECFilings(ticker: string): Promise<PublicSource[]> {
    if (!this.fmpService) return [];

    try {
      const filings = await this.fmpService.getSECFilings(ticker, undefined, 5);
      return filings.map((filing) => ({
        type: 'sec_filing' as const,
        source: `SEC EDGAR (${filing.type})`,
        title: `${ticker} ${filing.type} Filing`,
        content: `${ticker} filed ${filing.type} with the SEC on ${filing.fillingDate}. Accepted: ${filing.acceptedDate}.`,
        url: filing.finalLink || filing.link,
        timestamp: new Date(filing.fillingDate),
        relevance: filing.type === '10-K' || filing.type === '10-Q' ? 0.9 : 0.7,
      }));
    } catch (error) {
      console.error(`Failed to search SEC filings for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search market data and metrics
   */
  private async searchMarketData(ticker: string): Promise<PublicSource[]> {
    try {
      const [earnings, metrics] = await Promise.all([
        this.finnhub.getEarningsSurprises(ticker),
        this.finnhub.getMetrics(ticker),
      ]);

      const results: PublicSource[] = [];

      // Latest earnings
      if (earnings.length > 0) {
        const latest = earnings[0];
        results.push({
          type: 'market_data',
          source: 'Company Earnings',
          title: `${ticker} Q${latest.quarter} ${latest.year} Earnings`,
          content: `${ticker} reported Q${latest.quarter} ${latest.year} earnings: Actual EPS $${latest.actual.toFixed(2)} vs Estimate $${latest.estimate.toFixed(2)}, ${latest.surprise > 0 ? 'beating' : 'missing'} estimates by ${Math.abs(latest.surprisePercent).toFixed(1)}%`,
          timestamp: new Date(),
          relevance: 0.9,
        });
      }

      // Financial metrics
      if (metrics) {
        results.push({
          type: 'market_data',
          source: 'Financial Metrics',
          title: `${ticker} Key Metrics`,
          content: `${ticker} key metrics: Market Cap $${(metrics.marketCapitalization / 1000).toFixed(2)}B, 52-Week Range $${metrics['52WeekLow'].toFixed(2)} - $${metrics['52WeekHigh'].toFixed(2)}, P/E Ratio ${metrics.peBasicExclExtraTTM?.toFixed(2) || 'N/A'}`,
          timestamp: new Date(),
          relevance: 0.75,
        });
      }

      return results;
    } catch (error) {
      console.error(`Failed to search market data for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search general market news
   */
  private async searchGeneralNews(query: string): Promise<PublicSource[]> {
    if (!this.alphaVantage) return [];

    try {
      const newsItems = await this.alphaVantage.getNewsSentiment(undefined, [query]);
      return newsItems.slice(0, 5).map((item) => ({
        type: 'news' as const,
        source: item.source || 'Alpha Vantage News',
        title: item.title || '',
        content: `${item.title}. ${item.summary} (Sentiment: ${item.sentimentLabel}, Score: ${item.overallSentiment.toFixed(2)})`,
        url: item.url,
        timestamp: new Date(item.publishedAt),
        relevance: 0.7,
      }));
    } catch (error) {
      console.error('Failed to search general news via Alpha Vantage:', error);
      return [];
    }
  }

  /**
   * Extract ticker symbol from query.
   * Filters out common English words and abbreviations that match
   * the all-caps pattern but are not stock tickers.
   */
  private extractTicker(query: string): string | null {
    const tickerPattern = /\b([A-Z]{1,5})\b/g;
    const matches = query.match(tickerPattern);

    if (!matches || matches.length === 0) return null;

    const commonWords = new Set([
      'I', 'A', 'THE', 'IN', 'ON', 'AT', 'TO', 'FOR', 'OF', 'AND', 'OR', 'BUT',
      'IS', 'IT', 'IF', 'DO', 'SO', 'NO', 'UP', 'BY', 'AN', 'AM', 'AS', 'BE',
      'GO', 'HE', 'ME', 'MY', 'OK', 'US', 'WE',
      'ALL', 'ARE', 'CAN', 'DID', 'GET', 'GOT', 'HAS', 'HAD', 'HER', 'HIM',
      'HIS', 'HOW', 'ITS', 'LET', 'MAY', 'NEW', 'NOT', 'NOW', 'OLD', 'OUR',
      'OUT', 'OWN', 'SAY', 'SHE', 'TOO', 'USE', 'WAY', 'WHO', 'WHY', 'YET',
      'USA', 'FBI', 'CIA', 'CEO', 'CFO', 'CTO', 'COO', 'IPO', 'ETF', 'GDP',
      'API', 'FAQ', 'PDF', 'URL', 'NYSE', 'SEC',
      'BUY', 'SELL', 'HOLD', 'LONG', 'SHORT', 'CALL', 'PUT',
      'HIGH', 'LOW', 'OPEN', 'CLOSE', 'PRICE', 'STOCK', 'TRADE',
      'WHAT', 'WHEN', 'THIS', 'THAT', 'WITH', 'FROM', 'HAVE', 'WILL',
      'BEEN', 'WERE', 'THEM', 'THAN', 'EACH', 'MAKE', 'LIKE', 'JUST',
      'OVER', 'SUCH', 'TAKE', 'YEAR', 'SOME', 'ALSO', 'BACK', 'MUCH',
    ]);

    for (const match of matches) {
      if (match.length >= 1 && !commonWords.has(match)) {
        return match;
      }
    }

    return null;
  }

  /**
   * Format sources for citation
   */
  formatSources(sources: PublicSource[]): string[] {
    return sources.map(source => {
      const timestamp = source.timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      if (source.url) {
        return `[${source.type}] ${source.title} - ${source.source} (${timestamp}) - ${source.url}`;
      }

      return `[${source.type}] ${source.title} - ${source.source} (${timestamp})`;
    });
  }
}
