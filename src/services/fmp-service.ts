/**
 * Financial Modeling Prep (FMP) API Integration
 * Analyst price targets, SEC filings, company profiles, financial statements
 * Free tier: 250 requests/day
 */

import { RateLimiter } from '../utils/rate-limiter.js';
import { LRUCache } from '../utils/lru-cache.js';

export interface FMPPriceTargetConsensus {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

export interface FMPPriceTarget {
  symbol: string;
  publishedDate: string;
  newsURL: string;
  analystName: string;
  priceTarget: number;
  adjPriceTarget: number;
  priceWhenPosted: number;
  analystCompany: string;
  newsTitle: string;
}

export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  mktCap: number;
  price: number;
  beta: number;
  volAvg: number;
  lastDiv: number;
  changes: number;
  changesPercentage: number;
  description: string;
  ceo: string;
  fullTimeEmployees: string;
  ipoDate: string;
}

export interface FMPQuote {
  symbol: string;
  price: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  change: number;
  changesPercentage: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  eps: number;
  earningsAnnouncement: string;
}

export interface FMPSECFiling {
  symbol: string;
  cik: string;
  type: string;
  link: string;
  finalLink: string;
  acceptedDate: string;
  fillingDate: string;
}

export interface FMPIncomeStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  epsDiluted: number;
  grossProfitRatio: number;
  operatingIncomeRatio: number;
  netIncomeRatio: number;
}

export class FMPService {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private rateLimiter: RateLimiter;
  private cache = new LRUCache<unknown>(200);

  constructor(apiKey: string) {
    if (!apiKey || apiKey === 'undefined') {
      throw new Error('FMP API key is required');
    }
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter(250);
  }

  getRemainingCalls(): number {
    return this.rateLimiter.getRemaining();
  }

  /**
   * Get analyst consensus price target
   */
  async getPriceTargetConsensus(ticker: string): Promise<FMPPriceTargetConsensus | null> {
    const cacheKey = `ptc:${ticker}`;
    const cached = this.cache.get(cacheKey, 6 * 60 * 60 * 1000) as FMPPriceTargetConsensus | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      const url = `${this.baseUrl}/price-target-consensus/${ticker}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data: any = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const result: FMPPriceTargetConsensus = {
        symbol: data[0].symbol || ticker,
        targetHigh: data[0].targetHigh || 0,
        targetLow: data[0].targetLow || 0,
        targetConsensus: data[0].targetConsensus || 0,
        targetMedian: data[0].targetMedian || 0,
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch FMP price target consensus for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get individual analyst price targets
   */
  async getPriceTargets(ticker: string, limit: number = 10): Promise<FMPPriceTarget[]> {
    const cacheKey = `pt:${ticker}`;
    const cached = this.cache.get(cacheKey, 6 * 60 * 60 * 1000) as FMPPriceTarget[] | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      const url = `${this.baseUrl}/price-target/${ticker}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data: any = await response.json();
      if (!Array.isArray(data)) return [];

      const results: FMPPriceTarget[] = data.slice(0, limit).map((item: any) => ({
        symbol: item.symbol || ticker,
        publishedDate: item.publishedDate || '',
        newsURL: item.newsURL || '',
        analystName: item.analystName || '',
        priceTarget: item.priceTarget || 0,
        adjPriceTarget: item.adjPriceTarget || 0,
        priceWhenPosted: item.priceWhenPosted || 0,
        analystCompany: item.analystCompany || '',
        newsTitle: item.newsTitle || '',
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch FMP price targets for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get company profile
   */
  async getCompanyProfile(ticker: string): Promise<FMPCompanyProfile | null> {
    const cacheKey = `profile:${ticker}`;
    const cached = this.cache.get(cacheKey, 12 * 60 * 60 * 1000) as FMPCompanyProfile | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      const url = `${this.baseUrl}/profile/${ticker}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data: any = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const item = data[0];
      const result: FMPCompanyProfile = {
        symbol: item.symbol || ticker,
        companyName: item.companyName || '',
        sector: item.sector || '',
        industry: item.industry || '',
        mktCap: item.mktCap || 0,
        price: item.price || 0,
        beta: item.beta || 0,
        volAvg: item.volAvg || 0,
        lastDiv: item.lastDiv || 0,
        changes: item.changes || 0,
        changesPercentage: item.changesPercentage || 0,
        description: item.description || '',
        ceo: item.ceo || '',
        fullTimeEmployees: item.fullTimeEmployees || '',
        ipoDate: item.ipoDate || '',
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch FMP profile for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get real-time quote with OHLC
   */
  async getQuote(ticker: string): Promise<FMPQuote | null> {
    const cacheKey = `quote:${ticker}`;
    const cached = this.cache.get(cacheKey, 5 * 60 * 1000) as FMPQuote | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      const url = `${this.baseUrl}/quote/${ticker}?apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data: any = await response.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      const item = data[0];
      const result: FMPQuote = {
        symbol: item.symbol || ticker,
        price: item.price || 0,
        open: item.open || 0,
        dayHigh: item.dayHigh || 0,
        dayLow: item.dayLow || 0,
        previousClose: item.previousClose || 0,
        change: item.change || 0,
        changesPercentage: item.changesPercentage || 0,
        volume: item.volume || 0,
        avgVolume: item.avgVolume || 0,
        marketCap: item.marketCap || 0,
        pe: item.pe || 0,
        eps: item.eps || 0,
        earningsAnnouncement: item.earningsAnnouncement || '',
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`Failed to fetch FMP quote for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Get SEC filings
   */
  async getSECFilings(ticker: string, type?: string, limit: number = 10): Promise<FMPSECFiling[]> {
    const cacheKey = `sec:${ticker}:${type || 'all'}`;
    const cached = this.cache.get(cacheKey, 4 * 60 * 60 * 1000) as FMPSECFiling[] | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      let url = `${this.baseUrl}/sec_filings/${ticker}?apikey=${this.apiKey}&limit=${limit}`;
      if (type) {
        url += `&type=${type}`;
      }

      const response = await fetch(url);
      if (!response.ok) return [];

      const data: any = await response.json();
      if (!Array.isArray(data)) return [];

      const results: FMPSECFiling[] = data.map((item: any) => ({
        symbol: item.symbol || ticker,
        cik: item.cik || '',
        type: item.type || '',
        link: item.link || '',
        finalLink: item.finalLink || '',
        acceptedDate: item.acceptedDate || '',
        fillingDate: item.fillingDate || '',
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch FMP SEC filings for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get income statements
   */
  async getIncomeStatement(ticker: string, period: 'annual' | 'quarter' = 'annual', limit: number = 4): Promise<FMPIncomeStatement[]> {
    const cacheKey = `income:${ticker}:${period}`;
    const cached = this.cache.get(cacheKey, 24 * 60 * 60 * 1000) as FMPIncomeStatement[] | null;
    if (cached) return cached;

    try {
      await this.rateLimiter.acquire();
      const url = `${this.baseUrl}/income-statement/${ticker}?period=${period}&limit=${limit}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return [];

      const data: any = await response.json();
      if (!Array.isArray(data)) return [];

      const results: FMPIncomeStatement[] = data.map((item: any) => ({
        date: item.date || '',
        revenue: item.revenue || 0,
        grossProfit: item.grossProfit || 0,
        operatingIncome: item.operatingIncome || 0,
        netIncome: item.netIncome || 0,
        eps: item.eps || 0,
        epsDiluted: item.epsdiluted || 0,
        grossProfitRatio: item.grossProfitRatio || 0,
        operatingIncomeRatio: item.operatingIncomeRatio || 0,
        netIncomeRatio: item.netIncomeRatio || 0,
      }));

      this.cache.set(cacheKey, results);
      return results;
    } catch (error) {
      console.error(`Failed to fetch FMP income statement for ${ticker}:`, error);
      return [];
    }
  }
}
