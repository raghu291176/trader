/**
 * Public Sources Search Service
 * Searches external public sources for financial information
 */

import { FinnhubService } from './finnhub-service.js';

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

  constructor(finnhubApiKey: string) {
    this.finnhub = new FinnhubService(finnhubApiKey);
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

      // Price target
      if (priceTarget) {
        results.push({
          type: 'analyst_report',
          source: 'Analyst Price Targets',
          title: `${ticker} Price Target`,
          content: `Analyst price targets for ${ticker}: Mean target $${priceTarget.targetMean.toFixed(2)}, ranging from $${priceTarget.targetLow.toFixed(2)} (low) to $${priceTarget.targetHigh.toFixed(2)} (high). Last updated: ${priceTarget.lastUpdated}`,
          timestamp: new Date(priceTarget.lastUpdated),
          relevance: 0.85,
        });
      }

      return results;
    } catch (error) {
      console.error(`Failed to search analyst reports for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Search SEC filings via SEC EDGAR full-text search API
   */
  private async searchSECFilings(ticker: string): Promise<PublicSource[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const response = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(ticker)}&dateRange=custom&startdt=${ninetyDaysAgo}&enddt=${today}&forms=10-K,10-Q,8-K`,
        { headers: { 'User-Agent': 'PortfolioRotationAgent/1.0' } }
      );

      if (!response.ok) return [];

      const data: any = await response.json();
      const filings = data.hits?.hits || [];

      return filings.slice(0, 3).map((filing: any) => ({
        type: 'sec_filing' as const,
        source: 'SEC EDGAR',
        title: `${filing._source?.form_type || 'Filing'}: ${filing._source?.display_names?.[0] || ticker}`,
        content: `${filing._source?.form_type || 'SEC Filing'} for ${ticker} filed on ${filing._source?.file_date || 'unknown date'}. ${filing._source?.display_names?.[0] || ''}`,
        url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=${filing._source?.form_type || ''}&dateb=&owner=include&count=5`,
        timestamp: new Date(filing._source?.file_date || Date.now()),
        relevance: 0.7,
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
   * Search general market news via Finnhub earnings calendar as a proxy for market activity
   */
  private async searchGeneralNews(query: string): Promise<PublicSource[]> {
    try {
      // Use Finnhub earnings calendar for general market activity
      const calendar = await this.finnhub.getEarningsCalendar();
      const earnings = calendar?.earningsCalendar || [];

      return earnings.slice(0, 5).map((item: any) => ({
        type: 'news' as const,
        source: 'Earnings Calendar',
        title: `${item.symbol} Earnings: ${item.date}`,
        content: `${item.symbol} reports earnings on ${item.date}. EPS Estimate: $${item.epsEstimate?.toFixed(2) || 'N/A'}, Revenue Estimate: $${item.revenueEstimate ? (item.revenueEstimate / 1e9).toFixed(2) + 'B' : 'N/A'}`,
        timestamp: new Date(item.date || Date.now()),
        relevance: 0.6,
      }));
    } catch (error) {
      console.error('Failed to search general market news:', error);
      return [];
    }
  }

  /**
   * Extract ticker symbol from query
   */
  private extractTicker(query: string): string | null {
    // Match common ticker patterns (all caps, 1-5 letters)
    const tickerPattern = /\b([A-Z]{1,5})\b/g;
    const matches = query.match(tickerPattern);

    if (matches && matches.length > 0) {
      // Return the first match that looks like a ticker
      // Filter out common words like "I", "A", "THE", etc.
      const commonWords = ['I', 'A', 'THE', 'IN', 'ON', 'AT', 'TO', 'FOR', 'OF', 'AND', 'OR', 'BUT'];
      for (const match of matches) {
        if (!commonWords.includes(match) && match.length >= 2) {
          return match;
        }
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
