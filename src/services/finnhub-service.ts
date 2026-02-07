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

export interface FinnhubMetrics {
  '52WeekHigh': number;
  '52WeekLow': number;
  '52WeekHighDate': string;
  '52WeekLowDate': string;
  marketCapitalization: number;
  peBasicExclExtraTTM: number;
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
      const data = await response.json();
      return data as FinnhubRecommendation[];
    } catch (error) {
      console.error(`Failed to fetch recommendations for ${ticker}:`, error);
      return [] as FinnhubRecommendation[];
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
        // 403 is expected on Finnhub free tier — price-target is a premium endpoint
        if (response.status === 403) {
          return null;
        }
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data as FinnhubPriceTarget;
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
      const data = await response.json();
      return data as FinnhubNews[];
    } catch (error) {
      console.error(`Failed to fetch news for ${ticker}:`, error);
      return [] as FinnhubNews[];
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
      const data = await response.json();
      return data as FinnhubEarnings[];
    } catch (error) {
      console.error(`Failed to fetch earnings for ${ticker}:`, error);
      return [] as FinnhubEarnings[];
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
  /**
   * Get company metrics including 52-week high/low
   */
  async getMetrics(ticker: string): Promise<FinnhubMetrics | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/stock/metric?symbol=${ticker}&metric=all&token=${this.apiKey}`
      );

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      return data.metric || null;
    } catch (error) {
      console.error(`Error fetching metrics for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Analyze recent news and events to identify price catalysts
   */
  analyzePriceCatalysts(news: FinnhubNews[], earnings: FinnhubEarnings[]): Array<{
    type: 'earnings' | 'news' | 'upgrade' | 'downgrade';
    description: string;
    date: Date;
    impact: 'positive' | 'negative' | 'neutral';
  }> {
    const catalysts: Array<{
      type: 'earnings' | 'news' | 'upgrade' | 'downgrade';
      description: string;
      date: Date;
      impact: 'positive' | 'negative' | 'neutral';
    }> = [];

    // Check recent earnings (last 2)
    earnings.slice(0, 2).forEach(earning => {
      const impact = earning.surprise > 0 ? 'positive' : earning.surprise < 0 ? 'negative' : 'neutral';
      catalysts.push({
        type: 'earnings',
        description: `Q${earning.quarter} ${earning.year} Earnings: ${earning.surprise > 0 ? 'Beat' : 'Missed'} by ${Math.abs(earning.surprisePercent).toFixed(1)}%`,
        date: new Date(),
        impact
      });
    });

    // Analyze news headlines for key events
    const keywordMap = {
      positive: ['upgrade', 'beats', 'exceeds', 'jumps', 'surges', 'gains', 'partnership', 'acquisition', 'buyback', 'dividend'],
      negative: ['downgrade', 'misses', 'falls', 'drops', 'declines', 'lawsuit', 'investigation', 'recall', 'layoffs']
    };

    news.slice(0, 10).forEach(item => {
      const headline = item.headline.toLowerCase();
      let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
      let type: 'news' | 'upgrade' | 'downgrade' = 'news';

      if (headline.includes('upgrade')) {
        impact = 'positive';
        type = 'upgrade';
      } else if (headline.includes('downgrade')) {
        impact = 'negative';
        type = 'downgrade';
      } else {
        for (const keyword of keywordMap.positive) {
          if (headline.includes(keyword)) {
            impact = 'positive';
            break;
          }
        }
        for (const keyword of keywordMap.negative) {
          if (headline.includes(keyword)) {
            impact = 'negative';
            break;
          }
        }
      }

      if (impact !== 'neutral' || catalysts.length < 5) {
        catalysts.push({
          type,
          description: item.headline,
          date: new Date(item.datetime * 1000),
          impact
        });
      }
    });

    return catalysts.slice(0, 5); // Return top 5 catalysts
  }

  /**
   * Calculate monthly high from historical data
   */
  async getMonthlyHigh(ticker: string): Promise<{ price: number; date: string } | null> {
    try {
      // Get last 30 days of data
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60);

      const response = await fetch(
        `${this.baseUrl}/stock/candle?symbol=${ticker}&resolution=D&from=${from}&to=${to}&token=${this.apiKey}`
      );

      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();

      if (data.s !== 'ok' || !data.h || data.h.length === 0) {
        return null;
      }

      // Find the highest price in the last 30 days
      const maxPrice = Math.max(...data.h);
      const maxIndex = data.h.indexOf(maxPrice);
      const maxDate = new Date(data.t[maxIndex] * 1000);

      return {
        price: maxPrice,
        date: maxDate.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error(`Error fetching monthly high for ${ticker}:`, error);
      return null;
    }
  }

  async getTickerAnalysis(ticker: string): Promise<{
    recommendations: FinnhubRecommendation[];
    priceTarget: FinnhubPriceTarget | null;
    news: FinnhubNews[];
    earnings: FinnhubEarnings[];
    sentiment: number;
    metrics: FinnhubMetrics | null;
    monthlyHigh: { price: number; date: string } | null;
    catalysts: Array<{
      type: 'earnings' | 'news' | 'upgrade' | 'downgrade';
      description: string;
      date: Date;
      impact: 'positive' | 'negative' | 'neutral';
    }>;
  }> {
    const [recommendations, priceTarget, news, earnings, metrics, monthlyHigh] = await Promise.all([
      this.getRecommendations(ticker),
      this.getPriceTarget(ticker),
      this.getNews(ticker),
      this.getEarningsSurprises(ticker),
      this.getMetrics(ticker),
      this.getMonthlyHigh(ticker),
    ]);

    const sentiment = this.calculateNewsSentiment(news);
    const catalysts = this.analyzePriceCatalysts(news, earnings);

    return {
      recommendations,
      priceTarget,
      news,
      earnings,
      sentiment,
      metrics,
      monthlyHigh,
      catalysts,
    };
  }
}
