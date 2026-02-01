/**
 * Trade record - tracks individual buy/sell/rotation transactions
 * Links to spec Section 7 (Trade Execution)
 */

export interface Trade {
  readonly id: string;
  readonly timestamp: Date;
  readonly ticker: string;
  readonly type: 'BUY' | 'SELL' | 'ROTATION_IN' | 'ROTATION_OUT';
  readonly price: number;
  readonly shares: number;
  readonly totalValue: number;
  readonly score?: number;
  readonly reason?: string;
}

export class TradeRecord {
  private trades: Trade[] = [];
  private nextId = 0;

  /**
   * Record a new trade
   */
  recordTrade(
    ticker: string,
    type: Trade['type'],
    price: number,
    shares: number,
    score?: number,
    reason?: string
  ): Trade {
    const trade: Trade = {
      id: `trade_${this.nextId++}`,
      timestamp: new Date(),
      ticker,
      type,
      price,
      shares,
      totalValue: price * shares,
      score,
      reason,
    };

    this.trades.push(trade);
    return trade;
  }

  /**
   * Get all trades
   */
  getTrades(): readonly Trade[] {
    return [...this.trades];
  }

  /**
   * Get trades for a specific ticker
   */
  getTradesForTicker(ticker: string): Trade[] {
    return this.trades.filter((t) => t.ticker === ticker);
  }

  /**
   * Get trades of a specific type
   */
  getTradesOfType(type: Trade['type']): Trade[] {
    return this.trades.filter((t) => t.type === type);
  }

  /**
   * Get most recent trades (for diagnostics)
   */
  getRecentTrades(count: number): Trade[] {
    return [...this.trades].reverse().slice(0, count);
  }

  /**
   * Clear trade history (for backtesting)
   */
  clear(): void {
    this.trades = [];
    this.nextId = 0;
  }
}
