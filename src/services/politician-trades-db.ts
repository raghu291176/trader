/**
 * Politician Trades Database Service
 * Persists scraped congressional trading data to Neon PostgreSQL
 */

import { neon } from '@neondatabase/serverless';
import type { PoliticianTrade } from './politician-trades-scraper.js';

export class PoliticianTradesDatabase {
  private sql: ReturnType<typeof neon>;

  constructor(connectionString: string) {
    this.sql = neon(connectionString);
  }

  /**
   * Save politician trades (bulk insert with deduplication)
   */
  async saveTrades(trades: PoliticianTrade[]): Promise<number> {
    let inserted = 0;

    try {
      for (const trade of trades) {
        // Check if trade already exists (by politician, ticker, transaction date)
        const existing = await this.sql`
          SELECT id FROM trader.politician_trades
          WHERE politician_name = ${trade.politician}
            AND ticker = ${trade.ticker}
            AND transaction_date = ${trade.transactionDate.toISOString()}
        `;

        if (existing.length === 0) {
          await this.sql`
            INSERT INTO trader.politician_trades (
              politician_name, party, chamber, ticker, trade_type,
              amount, amount_min, amount_max,
              disclosure_date, transaction_date, asset_type, filing_url
            )
            VALUES (
              ${trade.politician},
              ${trade.party},
              ${trade.chamber},
              ${trade.ticker},
              ${trade.tradeType},
              ${trade.amount},
              ${trade.amountRange.min},
              ${trade.amountRange.max},
              ${trade.disclosureDate.toISOString()},
              ${trade.transactionDate.toISOString()},
              ${trade.assetType},
              ${trade.filingUrl || null}
            )
          `;
          inserted++;
        }
      }

      console.log(`💾 Saved ${inserted} new politician trades to database`);
      return inserted;
    } catch (error) {
      console.error('Failed to save politician trades:', error);
      return inserted;
    }
  }

  /**
   * Get trades for a specific ticker
   */
  async getTradesForTicker(ticker: string, limit: number = 20): Promise<PoliticianTrade[]> {
    try {
      const results = await this.sql`
        SELECT *
        FROM trader.politician_trades
        WHERE ticker = ${ticker}
        ORDER BY transaction_date DESC
        LIMIT ${limit}
      `;

      return this.mapRowsToTrades(results);
    } catch (error) {
      console.error(`Failed to get trades for ticker ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Get trades by politician
   */
  async getTradesByPolitician(name: string, limit: number = 50): Promise<PoliticianTrade[]> {
    try {
      const results = await this.sql`
        SELECT *
        FROM trader.politician_trades
        WHERE politician_name ILIKE ${`%${name}%`}
        ORDER BY transaction_date DESC
        LIMIT ${limit}
      `;

      return this.mapRowsToTrades(results);
    } catch (error) {
      console.error(`Failed to get trades for politician ${name}:`, error);
      return [];
    }
  }

  /**
   * Get recent trades (last 30 days)
   */
  async getRecentTrades(days: number = 30, limit: number = 100): Promise<PoliticianTrade[]> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await this.sql`
        SELECT *
        FROM trader.politician_trades
        WHERE transaction_date >= ${cutoffDate.toISOString()}
        ORDER BY transaction_date DESC
        LIMIT ${limit}
      `;

      return this.mapRowsToTrades(results);
    } catch (error) {
      console.error('Failed to get recent trades:', error);
      return [];
    }
  }

  /**
   * Get trading signal for a ticker based on recent activity
   */
  async getTickerSignal(ticker: string, days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await this.sql`
        SELECT trade_type, COUNT(*) as count
        FROM trader.politician_trades
        WHERE ticker = ${ticker}
          AND transaction_date >= ${cutoffDate.toISOString()}
        GROUP BY trade_type
      `;

      const buys = results.find(r => r.trade_type === 'BUY')?.count || 0;
      const sells = results.find(r => r.trade_type === 'SELL')?.count || 0;
      const total = buys + sells;

      if (total === 0) return 0;

      // Score: 0 = all sells, 0.5 = neutral, 1 = all buys
      return buys / total;
    } catch (error) {
      console.error(`Failed to calculate signal for ${ticker}:`, error);
      return 0;
    }
  }

  /**
   * Get top traded tickers by politicians
   */
  async getTopTickers(days: number = 30, limit: number = 10): Promise<Array<{
    ticker: string;
    buyCount: number;
    sellCount: number;
    signal: number;
  }>> {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const results = await this.sql`
        SELECT
          ticker,
          COUNT(CASE WHEN trade_type = 'BUY' THEN 1 END) as buy_count,
          COUNT(CASE WHEN trade_type = 'SELL' THEN 1 END) as sell_count,
          COUNT(*) as total_count
        FROM trader.politician_trades
        WHERE transaction_date >= ${cutoffDate.toISOString()}
          AND ticker != ''
        GROUP BY ticker
        ORDER BY total_count DESC
        LIMIT ${limit}
      `;

      return results.map(row => ({
        ticker: row.ticker,
        buyCount: row.buy_count,
        sellCount: row.sell_count,
        signal: row.total_count > 0 ? row.buy_count / row.total_count : 0,
      }));
    } catch (error) {
      console.error('Failed to get top tickers:', error);
      return [];
    }
  }

  /**
   * Get total trade count
   */
  async getTradeCount(): Promise<number> {
    try {
      const result = await this.sql`SELECT COUNT(*) as count FROM trader.politician_trades`;
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Failed to get trade count:', error);
      return 0;
    }
  }

  /**
   * Map database rows to PoliticianTrade objects
   */
  private mapRowsToTrades(rows: any[]): PoliticianTrade[] {
    return rows.map(row => ({
      politician: row.politician_name,
      party: row.party,
      chamber: row.chamber,
      ticker: row.ticker,
      tradeType: row.trade_type,
      amount: row.amount,
      amountRange: {
        min: row.amount_min,
        max: row.amount_max,
      },
      disclosureDate: new Date(row.disclosure_date),
      transactionDate: new Date(row.transaction_date),
      assetType: row.asset_type,
      filingUrl: row.filing_url,
    }));
  }
}
