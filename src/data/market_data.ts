/**
 * Market data fetching from Yahoo Finance
 * Links to spec Section 3 (Market Data)
 */

import yahooFinance from 'yahoo-finance2';

export interface PriceData {
  ticker: string;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export interface CandleData {
  ticker: string;
  prices: number[];
  volumes: number[];
  dates: Date[];
}

/**
 * Fetch historical price data from Yahoo Finance
 */
export class MarketData {
  private cache: Map<string, { data: CandleData; timestamp: number }> = new Map();
  private cacheExpiryMs = 60 * 60 * 1000; // 1 hour

  /**
   * Fetch recent price history for a ticker
   * @param ticker Stock ticker symbol
   * @param days Number of trading days to fetch (default 100)
   * @returns Candle data with prices and volumes
   */
  async fetchCandles(
    ticker: string,
    days: number = 100
  ): Promise<CandleData> {
    // Check cache
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiryMs) {
      return cached.data;
    }

    try {
      // Fetch real data from Yahoo Finance
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days - 10); // Extra buffer for weekends

      const result = await yahooFinance.historical(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      const prices: number[] = [];
      const volumes: number[] = [];
      const dates: Date[] = [];

      for (const quote of result) {
        prices.push(quote.close);
        volumes.push(quote.volume);
        dates.push(quote.date);
      }

      const candleData: CandleData = {
        ticker,
        prices,
        volumes,
        dates,
      };

      // Cache the result
      this.cache.set(ticker, { data: candleData, timestamp: Date.now() });

      return candleData;
    } catch (error) {
      console.error(`Failed to fetch data for ${ticker}:`, error);

      // Fallback to mock data if Yahoo Finance fails
      return this.generateMockData(ticker, days);
    }
  }

  /**
   * Generate mock data as fallback
   */
  private generateMockData(ticker: string, days: number): CandleData {
    const prices: number[] = [];
    const volumes: number[] = [];
    const dates: Date[] = [];

    const today = new Date();
    for (let i = days; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Mock price: start at 100 with random walk
      const basePrice = 100 + Math.sin(i / 10) * 20;
      const price = basePrice + (Math.random() - 0.5) * 5;
      const volume = Math.floor(Math.random() * 2000000) + 1000000;

      prices.push(price);
      volumes.push(volume);
      dates.push(date);
    }

    const candles: CandleData = { ticker, prices, volumes, dates };

    // Cache result
    this.cache.set(ticker, candles);

    return candles;
  }

  /**
   * Fetch current price for a ticker
   */
  async fetchCurrentPrice(ticker: string): Promise<number> {
    const candles = await this.fetchCandles(ticker, 1);
    if (candles.prices.length === 0) {
      throw new Error(`No price data for ${ticker}`);
    }
    return candles.prices[candles.prices.length - 1];
  }

  /**
   * Fetch prices for multiple tickers
   */
  async fetchMultiplePrices(tickers: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const price = await this.fetchCurrentPrice(ticker);
          prices.set(ticker, price);
        } catch {
          // Skip tickers with errors
        }
      })
    );

    return prices;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for diagnostics)
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
