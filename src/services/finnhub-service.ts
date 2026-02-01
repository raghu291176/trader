/**
 * Finnhub API Integration
 * Real analyst ratings, earnings, news, and recommendations
 */

export interface FinnhubRecommendation {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
  symbol: string;
}

export interface FinnhubNews {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubEarnings {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

export interface FinnhubPriceTarget {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

export class FinnhubService {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get analyst recommendations for a ticker
   */
  async getRecommendations(ticker: string): Promise<FinnhubRecommendation[]> {
    const url = `${this.baseUrl}/stock/recommendation?symbol=${ticker}&token=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch recommendations for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get price target from analysts
   */
  async getPriceTarget(ticker: string): Promise<FinnhubPriceTarget | null> {
    const url = `${this.baseUrl}/stock/price-target?symbol=${ticker}&token=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch price target for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get company news
   */
  async getNews(ticker: string, from?: Date, to?: Date): Promise<FinnhubNews[]> {
    const fromDate = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const toDate = to || new Date();

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const url = `${this.baseUrl}/company-news?symbol=${ticker}&from=${fromStr}&to=${toStr}&token=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch news for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get earnings surprises
   */
  async getEarningsSurprises(ticker: string): Promise<FinnhubEarnings[]> {
    const url = `${this.baseUrl}/stock/earnings?symbol=${ticker}&token=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch earnings for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get earnings calendar (upcoming)
   */
  async getEarningsCalendar(from?: Date, to?: Date): Promise<any> {
    const fromDate = from || new Date();
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const fromStr = fromDate.toISOString().split('T')[0];
    const toStr = toDate.toISOString().split('T')[0];

    const url = `${this.baseUrl}/calendar/earnings?from=${fromStr}&to=${toStr}&token=${this.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch earnings calendar:', error);
      return { earningsCalendar: [] };
    }
  }

  /**
   * Calculate sentiment from news
   */
  calculateNewsSentiment(news: FinnhubNews[]): number {
    if (news.length === 0) return 0;

    // Simple sentiment based on headline keywords
    const positiveWords = ['upgrade', 'beat', 'surge', 'rally', 'gain', 'strong', 'growth', 'positive'];
    const negativeWords = ['downgrade', 'miss', 'fall', 'drop', 'weak', 'loss', 'negative', 'concern'];

    let sentimentScore = 0;

    for (const item of news) {
      const text = (item.headline + ' ' + item.summary).toLowerCase();

      for (const word of positiveWords) {
        if (text.includes(word)) sentimentScore += 1;
      }

      for (const word of negativeWords) {
        if (text.includes(word)) sentimentScore -= 1;
      }
    }

    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, sentimentScore / news.length));
  }

  /**
   * Get comprehensive ticker analysis
   */
  async getTickerAnalysis(ticker: string): Promise<{
    recommendations: FinnhubRecommendation[];
    priceTarget: FinnhubPriceTarget | null;
    news: FinnhubNews[];
    earnings: FinnhubEarnings[];
    sentiment: number;
  }> {
    const [recommendations, priceTarget, news, earnings] = await Promise.all([
      this.getRecommendations(ticker),
      this.getPriceTarget(ticker),
      this.getNews(ticker),
      this.getEarningsSurprises(ticker),
    ]);

    const sentiment = this.calculateNewsSentiment(news);

    return {
      recommendations,
      priceTarget,
      news,
      earnings,
      sentiment,
    };
  }
}
