/**
 * Portfolio Database Service
 * Manages portfolio persistence in Neon PostgreSQL
 */

import { neon } from '@neondatabase/serverless';
import type { Portfolio } from '../models/portfolio.js';
import type { Position } from '../models/position.js';
import type { Trade } from '../models/trade.js';

export class PortfolioDatabase {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  /**
   * Create or update portfolio
   */
  async savePortfolio(portfolio: Portfolio, userId: string = 'default'): Promise<number> {
    try {
      // Check if portfolio exists for this user
      const existing = await this.sql`
        SELECT id FROM trader.portfolios WHERE user_id = ${userId}
      `;

      if ((existing as any[]).length > 0) {
        // Update existing portfolio
        await this.sql`
          UPDATE trader.portfolios
          SET
            current_value = ${portfolio.getTotalValue()},
            cash = ${portfolio.getCash()},
            peak_value = ${portfolio['peakValue']},
            updated_at = NOW()
          WHERE user_id = ${userId}
        `;
        return (existing as any[])[0].id;
      } else {
        // Insert new portfolio
        const result = await this.sql`
          INSERT INTO trader.portfolios (user_id, initial_capital, current_value, cash, peak_value)
          VALUES (${userId}, ${portfolio['initialCapital']}, ${portfolio.getTotalValue()}, ${portfolio.getCash()}, ${portfolio['peakValue']})
          RETURNING id
        `;
        return (result as any[])[0].id;
      }
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      throw error;
    }
  }

  /**
   * Load portfolio by user ID
   */
  async loadPortfolio(userId: string = 'default'): Promise<{
    id: number;
    initialCapital: number;
    currentValue: number;
    cash: number;
    peakValue: number;
  } | null> {
    try {
      const result = await this.sql`
        SELECT id, initial_capital, current_value, cash, peak_value
        FROM trader.portfolios
        WHERE user_id = ${userId}
      `;

      if ((result as any[]).length === 0) return null;

      const row = (result as any[])[0];
      return {
        id: row.id,
        initialCapital: row.initial_capital,
        currentValue: row.current_value,
        cash: row.cash,
        peakValue: row.peak_value,
      };
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      return null;
    }
  }

  /**
   * Save positions
   */
  async savePositions(portfolioId: number, positions: Position[]): Promise<void> {
    try {
      // Clear existing positions for this portfolio
      await this.sql`DELETE FROM trader.positions WHERE portfolio_id = ${portfolioId}`;

      // Insert current positions
      for (const pos of positions) {
        await this.sql`
          INSERT INTO trader.positions (
            portfolio_id, ticker, shares, entry_price, current_price,
            entry_score, entry_timestamp
          )
          VALUES (
            ${portfolioId},
            ${pos.ticker},
            ${pos.shares},
            ${pos.entryPrice},
            ${pos.currentPrice},
            ${pos.entryScore},
            ${pos.entryTimestamp.toISOString()}
          )
        `;
      }
    } catch (error) {
      console.error('Failed to save positions:', error);
      throw error;
    }
  }

  /**
   * Load positions for a portfolio
   */
  async loadPositions(portfolioId: number): Promise<Position[]> {
    try {
      const results = await this.sql`
        SELECT ticker, shares, entry_price, current_price, entry_score, entry_timestamp
        FROM trader.positions
        WHERE portfolio_id = ${portfolioId}
        ORDER BY entry_timestamp DESC
      `;

      return (results as any[]).map(row => ({
        ticker: row.ticker,
        shares: row.shares,
        entryPrice: row.entry_price,
        currentPrice: row.current_price,
        entryScore: row.entry_score,
        entryTimestamp: new Date(row.entry_timestamp),
        getUnrealizedPnL: function() {
          return (this.currentPrice - this.entryPrice) * this.shares;
        },
        getUnrealizedPnLPercent: function() {
          return ((this.currentPrice - this.entryPrice) / this.entryPrice) * 100;
        },
        getValue: function() {
          return this.currentPrice * this.shares;
        },
      })) as Position[];
    } catch (error) {
      console.error('Failed to load positions:', error);
      return [];
    }
  }

  /**
   * Save a trade
   */
  async saveTrade(portfolioId: number, trade: Trade): Promise<void> {
    try {
      await this.sql`
        INSERT INTO trader.trades (
          portfolio_id, ticker, trade_type, shares, price, score, reason, timestamp
        )
        VALUES (
          ${portfolioId},
          ${trade.ticker},
          ${trade.type},
          ${trade.shares},
          ${trade.price},
          ${trade.score || null},
          ${trade.reason || null},
          ${trade.timestamp.toISOString()}
        )
      `;
    } catch (error) {
      console.error('Failed to save trade:', error);
      throw error;
    }
  }

  /**
   * Load trade history for a portfolio
   */
  async loadTrades(portfolioId: number, limit: number = 100): Promise<Trade[]> {
    try {
      const results = await this.sql`
        SELECT ticker, trade_type, shares, price, score, reason, timestamp
        FROM trader.trades
        WHERE portfolio_id = ${portfolioId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return (results as any[]).map(row => ({
        ticker: row.ticker,
        type: row.trade_type,
        shares: row.shares,
        price: row.price,
        score: row.score,
        reason: row.reason,
        timestamp: new Date(row.timestamp),
      })) as Trade[];
    } catch (error) {
      console.error('Failed to load trades:', error);
      return [];
    }
  }

  /**
   * Get portfolio stats
   */
  async getPortfolioStats(portfolioId: number): Promise<{
    totalTrades: number;
    winRate: number;
    avgReturn: number;
  }> {
    try {
      const trades = await this.loadTrades(portfolioId);

      // Calculate win rate by matching BUY/SELL pairs
      let wins = 0;
      let total = 0;
      let totalReturn = 0;

      const buyTrades = trades.filter(t => t.type === 'BUY');
      const sellTrades = trades.filter(t => t.type === 'SELL');

      for (const sell of sellTrades) {
        const buy = buyTrades.find(b => b.ticker === sell.ticker && b.timestamp < sell.timestamp);
        if (buy) {
          total++;
          const returnPct = ((sell.price - buy.price) / buy.price) * 100;
          totalReturn += returnPct;
          if (returnPct > 0) wins++;
        }
      }

      return {
        totalTrades: trades.length,
        winRate: total > 0 ? (wins / total) * 100 : 0,
        avgReturn: total > 0 ? totalReturn / total : 0,
      };
    } catch (error) {
      console.error('Failed to calculate portfolio stats:', error);
      return { totalTrades: 0, winRate: 0, avgReturn: 0 };
    }
  }
}
