/**
 * Twelve Data API Integration
 * Pre-computed technical indicators and OHLC time series
 * Free tier: 800 requests/day
 */

import { RateLimiter } from '../utils/rate-limiter.js';

export interface TwelveDataTimeSeries {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TwelveDataIndicatorBundle {
  rsi: { value: number; signal: string };
  macd: { macd: number; signal: number; histogram: number; trend: string };
  bollinger: { upper: number; middle: number; lower: number; percentB: number };
  stochastic: { k: number; d: number; signal: string };
  trend: string;
  strength: number;
  adx?: number;
  atr?: number;
}

export class TwelveDataService {
  private apiKey: string;
  private baseUrl = 'https://api.twelvedata.com';
  private rateLimiter: RateLimiter;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(800);
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

  private async fetchIndicator(endpoint: string, ticker: string, params: Record<string, string> = {}): Promise<any[]> {
    await this.rateLimiter.acquire();

    const searchParams = new URLSearchParams({
      symbol: ticker,
      interval: '1day',
      apikey: this.apiKey,
      ...params,
    });

    const url = `${this.baseUrl}/${endpoint}?${searchParams.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.statusText}`);
    }

    const data: any = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Twelve Data API error');
    }

    return data.values || [];
  }

  /**
   * Get OHLCV time series
   */
  async getTimeSeries(ticker: string, interval: string = '1day', outputsize: number = 100): Promise<TwelveDataTimeSeries[]> {
    const cacheKey = `ts:${ticker}:${interval}:${outputsize}`;
    const cacheMs = interval === '1day' ? 15 * 60 * 1000 : 5 * 60 * 1000;
    const cached = this.getCached<TwelveDataTimeSeries[]>(cacheKey, cacheMs);
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();

      const searchParams = new URLSearchParams({
        symbol: ticker,
        interval,
        outputsize: String(outputsize),
        apikey: this.apiKey,
      });

      const url = `${this.baseUrl}/time_series?${searchParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data: any = await response.json();
      if (data.status === 'error' || !data.values) return [];

      const results: TwelveDataTimeSeries[] = data.values.map((v: any) => ({
        datetime: v.datetime || '',
        open: parseFloat(v.open) || 0,
        high: parseFloat(v.high) || 0,
        low: parseFloat(v.low) || 0,
        close: parseFloat(v.close) || 0,
        volume: parseInt(v.volume) || 0,
      }));

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data time series for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get RSI indicator
   */
  async getRSI(ticker: string, period: number = 14): Promise<Array<{ datetime: string; rsi: number }>> {
    const cacheKey = `rsi:${ticker}:${period}`;
    const cached = this.getCached<Array<{ datetime: string; rsi: number }>>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('rsi', ticker, { time_period: String(period) });
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        rsi: parseFloat(v.rsi) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data RSI for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get MACD indicator
   */
  async getMACD(ticker: string): Promise<Array<{ datetime: string; macd: number; macd_signal: number; macd_hist: number }>> {
    const cacheKey = `macd:${ticker}`;
    const cached = this.getCached<any[]>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('macd', ticker);
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        macd: parseFloat(v.macd) || 0,
        macd_signal: parseFloat(v.macd_signal) || 0,
        macd_hist: parseFloat(v.macd_hist) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data MACD for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get Bollinger Bands
   */
  async getBollingerBands(ticker: string): Promise<Array<{ datetime: string; upper_band: number; middle_band: number; lower_band: number }>> {
    const cacheKey = `bbands:${ticker}`;
    const cached = this.getCached<any[]>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('bbands', ticker);
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        upper_band: parseFloat(v.upper_band) || 0,
        middle_band: parseFloat(v.middle_band) || 0,
        lower_band: parseFloat(v.lower_band) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data Bollinger Bands for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get Stochastic oscillator
   */
  async getStochastic(ticker: string): Promise<Array<{ datetime: string; slow_k: number; slow_d: number }>> {
    const cacheKey = `stoch:${ticker}`;
    const cached = this.getCached<any[]>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('stoch', ticker);
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        slow_k: parseFloat(v.slow_k) || 0,
        slow_d: parseFloat(v.slow_d) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data Stochastic for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get ADX (Average Directional Index)
   */
  async getADX(ticker: string, period: number = 14): Promise<Array<{ datetime: string; adx: number }>> {
    const cacheKey = `adx:${ticker}:${period}`;
    const cached = this.getCached<any[]>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('adx', ticker, { time_period: String(period) });
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        adx: parseFloat(v.adx) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data ADX for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get ATR (Average True Range)
   */
  async getATR(ticker: string, period: number = 14): Promise<Array<{ datetime: string; atr: number }>> {
    const cacheKey = `atr:${ticker}:${period}`;
    const cached = this.getCached<any[]>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    try {
      const values = await this.fetchIndicator('atr', ticker, { time_period: String(period) });
      const results = values.map((v: any) => ({
        datetime: v.datetime || '',
        atr: parseFloat(v.atr) || 0,
      }));
      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch Twelve Data ATR for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get all indicators in one call (parallel fetch)
   * Uses 5 API calls per invocation
   */
  async getIndicatorBundle(ticker: string): Promise<TwelveDataIndicatorBundle> {
    const cacheKey = `bundle:${ticker}`;
    const cached = this.getCached<TwelveDataIndicatorBundle>(cacheKey, 15 * 60 * 1000);
    if (cached) return cached;

    const [rsiData, macdData, bbandsData, stochData, adxData] = await Promise.all([
      this.getRSI(ticker),
      this.getMACD(ticker),
      this.getBollingerBands(ticker),
      this.getStochastic(ticker),
      this.getADX(ticker),
    ]);

    // Use latest values
    const latestRSI = rsiData[0]?.rsi || 50;
    const latestMACD = macdData[0] || { macd: 0, macd_signal: 0, macd_hist: 0 };
    const latestBBands = bbandsData[0] || { upper_band: 0, middle_band: 0, lower_band: 0 };
    const latestStoch = stochData[0] || { slow_k: 50, slow_d: 50 };
    const latestADX = adxData[0]?.adx || 0;

    // Derive signals
    const rsiSignal = latestRSI > 70 ? 'overbought' : latestRSI < 30 ? 'oversold' : 'neutral';
    const macdTrend = latestMACD.macd_hist > 0 ? 'bullish' : 'bearish';
    const stochSignal = latestStoch.slow_k > 80 ? 'overbought' : latestStoch.slow_k < 20 ? 'oversold' : 'neutral';

    // Calculate Bollinger %B
    const bbandsRange = latestBBands.upper_band - latestBBands.lower_band;
    const percentB = bbandsRange > 0
      ? (latestBBands.middle_band - latestBBands.lower_band) / bbandsRange
      : 0.5;

    // Determine overall trend
    const bullishSignals = [
      latestRSI > 50,
      latestMACD.macd_hist > 0,
      latestStoch.slow_k > 50,
    ].filter(Boolean).length;

    const trend = bullishSignals >= 2 ? 'bullish' : bullishSignals <= 1 ? 'bearish' : 'neutral';
    const strength = Math.round((latestADX / 100) * 100); // ADX as percentage strength

    const bundle: TwelveDataIndicatorBundle = {
      rsi: { value: latestRSI, signal: rsiSignal },
      macd: {
        macd: latestMACD.macd,
        signal: latestMACD.macd_signal,
        histogram: latestMACD.macd_hist,
        trend: macdTrend,
      },
      bollinger: {
        upper: latestBBands.upper_band,
        middle: latestBBands.middle_band,
        lower: latestBBands.lower_band,
        percentB,
      },
      stochastic: { k: latestStoch.slow_k, d: latestStoch.slow_d, signal: stochSignal },
      trend,
      strength,
      adx: latestADX,
    };

    this.setCache(cacheKey, bundle);
    return bundle;
  }
}
