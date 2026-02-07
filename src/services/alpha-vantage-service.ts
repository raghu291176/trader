/**
 * Alpha Vantage API Integration
 * News sentiment and comprehensive company fundamentals
 * Free tier: 25 requests/day
 */

import { RateLimiter } from '../utils/rate-limiter.js';

export interface AlphaVantageNewsSentiment {
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt: string;
  overallSentiment: number;
  sentimentLabel: string;
  tickers: Array<{
    ticker: string;
    relevanceScore: number;
    sentimentScore: number;
    sentimentLabel: string;
  }>;
}

export interface AlphaVantageCompanyOverview {
  symbol: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number;
  peRatio: number;
  pegRatio: number;
  eps: number;
  dividendYield: number;
  beta: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  forwardPE: number;
  priceToBook: number;
  profitMargin: number;
  returnOnEquity: number;
  revenueGrowth: number;
  debtToEquity: number;
  quarterlyEarningsGrowth: number;
  analystTargetPrice: number;
}

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private rateLimiter: RateLimiter;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(25);
  }

  getRemainingCalls(): number {
    return this.rateLimiter.getRemaining();
  }

  private getCached<T>(key: string, expiryMs: number): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < expiryMs) {
      return entry.data as T;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get news with ML-powered sentiment scores
   */
  async getNewsSentiment(tickers?: string[], topics?: string[]): Promise<AlphaVantageNewsSentiment[]> {
    const cacheKey = `news:${tickers?.join(',') || 'general'}:${topics?.join(',') || ''}`;
    const cached = this.getCached<AlphaVantageNewsSentiment[]>(cacheKey, 4 * 60 * 60 * 1000); // 4h cache
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();

      let url = `${this.baseUrl}?function=NEWS_SENTIMENT&apikey=${this.apiKey}`;
      if (tickers && tickers.length > 0) {
        url += `&tickers=${tickers.join(',')}`;
      }
      if (topics && topics.length > 0) {
        url += `&topics=${topics.join(',')}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.Note || data.Information) {
        console.warn('Alpha Vantage rate limit or info:', data.Note || data.Information);
        return [];
      }

      const feed = data.feed || [];
      const results: AlphaVantageNewsSentiment[] = feed.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        summary: item.summary || '',
        source: item.source || '',
        publishedAt: item.time_published || '',
        overallSentiment: parseFloat(item.overall_sentiment_score) || 0,
        sentimentLabel: item.overall_sentiment_label || 'Neutral',
        tickers: (item.ticker_sentiment || []).map((ts: any) => ({
          ticker: ts.ticker || '',
          relevanceScore: parseFloat(ts.relevance_score) || 0,
          sentimentScore: parseFloat(ts.ticker_sentiment_score) || 0,
          sentimentLabel: ts.ticker_sentiment_label || 'Neutral',
        })),
      }));

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Failed to fetch Alpha Vantage news sentiment:', error);
      return [];
    }
  }

  /**
   * Get comprehensive company fundamentals
   */
  async getCompanyOverview(ticker: string): Promise<AlphaVantageCompanyOverview | null> {
    const cacheKey = `overview:${ticker}`;
    const cached = this.getCached<AlphaVantageCompanyOverview>(cacheKey, 12 * 60 * 60 * 1000); // 12h cache
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();

      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${ticker}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.Note || data.Information) {
        console.warn('Alpha Vantage rate limit or info:', data.Note || data.Information);
        return null;
      }

      if (!data.Symbol) {
        return null;
      }

      const result: AlphaVantageCompanyOverview = {
        symbol: data.Symbol,
        name: data.Name || '',
        description: data.Description || '',
        sector: data.Sector || '',
        industry: data.Industry || '',
        marketCap: parseFloat(data.MarketCapitalization) || 0,
        peRatio: parseFloat(data.PERatio) || 0,
        pegRatio: parseFloat(data.PEGRatio) || 0,
        eps: parseFloat(data.EPS) || 0,
        dividendYield: parseFloat(data.DividendYield) || 0,
        beta: parseFloat(data.Beta) || 0,
        fiftyTwoWeekHigh: parseFloat(data['52WeekHigh']) || 0,
        fiftyTwoWeekLow: parseFloat(data['52WeekLow']) || 0,
        forwardPE: parseFloat(data.ForwardPE) || 0,
        priceToBook: parseFloat(data.PriceToBookRatio) || 0,
        profitMargin: parseFloat(data.ProfitMargin) || 0,
        returnOnEquity: parseFloat(data.ReturnOnEquityTTM) || 0,
        revenueGrowth: parseFloat(data.QuarterlyRevenueGrowthYOY) || 0,
        debtToEquity: parseFloat(data.DebtToEquityRatio) || 0, // Added for clarity
        quarterlyEarningsGrowth: parseFloat(data.QuarterlyEarningsGrowthYOY) || 0,
        analystTargetPrice: parseFloat(data.AnalystTargetPrice) || 0,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch Alpha Vantage overview for ${ticker}:`, error);
      return null;
    }
  }
}
