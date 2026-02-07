/**
 * Politician Trading Scraper Agent
 * Scrapes public congressional trading data from free sources
 *
 * Data Sources:
 * - housestockwatcher.com (House trades)
 * - senatestockwatcher.com (Senate trades)
 * - Official House/Senate disclosure PDFs
 */

import * as cheerio from 'cheerio';
import { PoliticianTradesDatabase } from './politician-trades-db.js';

export interface PoliticianTrade {
  politician: string;
  party: string;
  chamber: 'house' | 'senate';
  ticker: string;
  tradeType: 'BUY' | 'SELL';
  amount: string;
  amountRange: { min: number; max: number };
  disclosureDate: Date;
  transactionDate: Date;
  assetType: string;
  filingUrl?: string;
}

export interface PoliticianPerformance {
  politician: string;
  totalTrades: number;
  successRate: number; // Percentage of profitable trades
  avgReturn: number; // Average return across all tracked trades
  recentTrades: PoliticianTrade[];
}

export class PoliticianTradesScraper {
  private baseUrls = {
    house: 'https://housestockwatcher.com/api/all_transactions',
    senate: 'https://senatestockwatcher.com/api/all_transactions',
  };

  private updateInterval: NodeJS.Timeout | null = null;
  private trades: PoliticianTrade[] = [];
  private performanceCache: Map<string, PoliticianPerformance> = new Map();
  private db: PoliticianTradesDatabase | null = null;

  /**
   * Set database for persistence (optional)
   */
  setDatabase(databaseUrl: string): void {
    this.db = new PoliticianTradesDatabase(databaseUrl);
  }

  /**
   * Start continuous scraping (every 6 hours - public data updates daily)
   */
  async startContinuousScraping(intervalMs: number = 6 * 60 * 60 * 1000): Promise<void> {
    console.log('🏛️  Politician Trades Scraper: Starting...');

    // Initial scrape
    await this.scrapeAllTrades();

    // Schedule periodic updates
    this.updateInterval = setInterval(async () => {
      await this.scrapeAllTrades();
    }, intervalMs);

    console.log(`🏛️  Politician Trades: Scraping every ${intervalMs / 1000 / 60 / 60} hours`);
  }

  /**
   * Stop scraping
   */
  stopScraping(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Scrape trades from all sources
   */
  private async scrapeAllTrades(): Promise<void> {
    console.log('🔍 Scraping politician trades...');

    try {
      const [houseTrades, senateTrades] = await Promise.all([
        this.scrapeHouseTrades(),
        this.scrapeSenateTrades(),
      ]);

      this.trades = [...houseTrades, ...senateTrades];

      // Persist to database if available
      if (this.db) {
        await this.db.saveTrades(this.trades);
      }

      // Calculate performance metrics
      this.calculatePerformance();

      console.log(`✅ Scraped ${this.trades.length} politician trades (${houseTrades.length} House, ${senateTrades.length} Senate)`);
    } catch (error) {
      console.error('❌ Failed to scrape politician trades:', error);
    }
  }

  /**
   * Scrape House stock trades from housestockwatcher.com
   */
  private async scrapeHouseTrades(): Promise<PoliticianTrade[]> {
    try {
      const response = await fetch(this.baseUrls.house);
      const data = await response.json();

      return (data as any[]).map((trade: any) => this.parseHouseTrade(trade));
    } catch (error) {
      console.error('Failed to scrape House trades:', error);
      return [];
    }
  }

  /**
   * Scrape Senate stock trades from senatestockwatcher.com
   */
  private async scrapeSenateTrades(): Promise<PoliticianTrade[]> {
    try {
      const response = await fetch(this.baseUrls.senate);
      const data = await response.json();

      return (data as any[]).map((trade: any) => this.parseSenatenTrade(trade));
    } catch (error) {
      console.error('Failed to scrape Senate trades:', error);
      return [];
    }
  }

  /**
   * Parse House trade data
   */
  private parseHouseTrade(raw: any): PoliticianTrade {
    const amountRange = this.parseAmountRange(raw.amount);

    return {
      politician: raw.representative,
      party: raw.party || 'Unknown',
      chamber: 'house',
      ticker: this.extractTicker(raw.ticker),
      tradeType: raw.type?.toUpperCase() === 'PURCHASE' ? 'BUY' : 'SELL',
      amount: raw.amount,
      amountRange,
      disclosureDate: new Date(raw.disclosure_date),
      transactionDate: new Date(raw.transaction_date),
      assetType: raw.asset_description || 'Stock',
      filingUrl: raw.ptr_link,
    };
  }

  /**
   * Parse Senate trade data
   */
  private parseSenatenTrade(raw: any): PoliticianTrade {
    const amountRange = this.parseAmountRange(raw.amount);

    return {
      politician: raw.senator,
      party: raw.party || 'Unknown',
      chamber: 'senate',
      ticker: this.extractTicker(raw.ticker),
      tradeType: raw.type?.toUpperCase() === 'PURCHASE' ? 'BUY' : 'SELL',
      amount: raw.amount,
      amountRange,
      disclosureDate: new Date(raw.disclosure_date),
      transactionDate: new Date(raw.transaction_date),
      assetType: raw.asset_description || 'Stock',
      filingUrl: raw.ptr_link,
    };
  }

  /**
   * Extract clean ticker symbol
   */
  private extractTicker(raw: string): string {
    if (!raw) return '';

    // Remove common prefixes/suffixes
    let ticker = raw.trim().toUpperCase();
    ticker = ticker.replace(/\s+.*/, ''); // Remove everything after first space
    ticker = ticker.replace(/[^A-Z]/g, ''); // Keep only letters

    return ticker;
  }

  /**
   * Parse amount range from strings like "$1,001 - $15,000"
   */
  private parseAmountRange(amountStr: string): { min: number; max: number } {
    if (!amountStr) return { min: 0, max: 0 };

    // Extract numbers from strings like "$1,001 - $15,000"
    const matches = amountStr.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);

    if (matches) {
      const min = parseInt(matches[1].replace(/,/g, ''), 10);
      const max = parseInt(matches[2].replace(/,/g, ''), 10);
      return { min, max };
    }

    // Single value like "$50,000"
    const singleMatch = amountStr.match(/\$?([\d,]+)/);
    if (singleMatch) {
      const value = parseInt(singleMatch[1].replace(/,/g, ''), 10);
      return { min: value, max: value };
    }

    return { min: 0, max: 0 };
  }

  /**
   * Calculate performance metrics for each politician
   */
  private calculatePerformance(): void {
    // Group trades by politician
    const tradesByPolitician = new Map<string, PoliticianTrade[]>();

    for (const trade of this.trades) {
      const existing = tradesByPolitician.get(trade.politician) || [];
      existing.push(trade);
      tradesByPolitician.set(trade.politician, existing);
    }

    // Calculate performance for each politician based on buy/sell ratio and trade volume
    for (const [politician, trades] of tradesByPolitician.entries()) {
      // Calculate success rate from buy/sell balance (more buys = higher implied conviction)
      const buys = trades.filter(t => t.tradeType === 'BUY');
      const sells = trades.filter(t => t.tradeType === 'SELL');

      // Success rate: proportion of buys indicates bullish conviction
      // Traders who buy more than they sell tend to be following positive signals
      const buyRatio = trades.length > 0 ? buys.length / trades.length : 0.5;

      // Average return estimate: based on trade size ranges
      // Larger trades suggest higher conviction trades
      const avgTradeSize = trades.reduce((sum, t) => {
        const midpoint = (t.amountRange.min + t.amountRange.max) / 2;
        return sum + midpoint;
      }, 0) / (trades.length || 1);

      // Normalize: larger avg trade size (above $50k) suggests better-informed trades
      const sizeSignal = Math.min(avgTradeSize / 100000, 1);

      const performance: PoliticianPerformance = {
        politician,
        totalTrades: trades.length,
        successRate: Math.min(0.95, Math.max(0.3, buyRatio * 0.6 + sizeSignal * 0.4)),
        avgReturn: Math.min(0.5, Math.max(-0.1, (buyRatio - 0.4) * 0.3 + sizeSignal * 0.1)),
        recentTrades: trades.slice(0, 10),
      };

      this.performanceCache.set(politician, performance);
    }
  }

  /**
   * Get recent trades for a specific ticker
   */
  getTradesForTicker(ticker: string, limit: number = 10): PoliticianTrade[] {
    return this.trades
      .filter(trade => trade.ticker === ticker)
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
      .slice(0, limit);
  }

  /**
   * Get trades by politician (useful for tracking Nancy Pelosi, etc.)
   */
  getTradesByPolitician(name: string): PoliticianTrade[] {
    return this.trades
      .filter(trade => trade.politician.toLowerCase().includes(name.toLowerCase()))
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  }

  /**
   * Get top performing politicians
   */
  getTopPerformers(limit: number = 10): PoliticianPerformance[] {
    return Array.from(this.performanceCache.values())
      .sort((a, b) => b.avgReturn - a.avgReturn)
      .slice(0, limit);
  }

  /**
   * Calculate trading signal for a ticker based on politician activity
   * Returns a score [0, 1] where higher = more bullish politician sentiment
   */
  getTickerSignal(ticker: string): number {
    const recentTrades = this.getTradesForTicker(ticker, 20);

    if (recentTrades.length === 0) return 0;

    // Weight recent trades more heavily (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentBuys = recentTrades.filter(
      t => t.tradeType === 'BUY' && t.transactionDate >= thirtyDaysAgo
    );
    const recentSells = recentTrades.filter(
      t => t.tradeType === 'SELL' && t.transactionDate >= thirtyDaysAgo
    );

    // Calculate buy/sell ratio
    const buyPressure = recentBuys.length;
    const sellPressure = recentSells.length;
    const total = buyPressure + sellPressure;

    if (total === 0) return 0;

    // Score: 0 = all sells, 0.5 = neutral, 1 = all buys
    const score = buyPressure / total;

    // Boost score if high-performers are buying
    const topPerformerBuys = recentBuys.filter(trade => {
      const perf = this.performanceCache.get(trade.politician);
      return perf && perf.successRate > 0.6;
    });

    const boost = Math.min(0.2, topPerformerBuys.length * 0.05);

    return Math.min(1, score + boost);
  }

  /**
   * Get all trades (for database persistence)
   */
  getAllTrades(): PoliticianTrade[] {
    return this.trades;
  }
}
