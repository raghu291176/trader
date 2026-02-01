/**
 * Portfolio state management
 * Tracks positions, cash, P&L, peak value
 * Links to spec Section 6 (Position Tracking)
 */

import { Position, PositionData } from './position.js';
import { TradeRecord, Trade } from './trade.js';

export interface PortfolioData {
  capital: number;
  positions: PositionData[];
  cash: number;
  peakValue: number;
  trades: Trade[];
}

export class Portfolio {
  private positions: Map<string, Position> = new Map();
  private capital: number;
  private cash: number;
  private peakValue: number;
  private trades: TradeRecord;

  constructor(initialCapital: number) {
    this.capital = initialCapital;
    this.cash = initialCapital;
    this.peakValue = initialCapital;
    this.trades = new TradeRecord();
  }

  /**
   * Get total portfolio value
   */
  getTotalValue(): number {
    let positionValue = 0;
    for (const position of this.positions.values()) {
      positionValue += position.getValue();
    }
    return positionValue + this.cash;
  }

  /**
   * Get available cash
   */
  getCash(): number {
    return this.cash;
  }

  /**
   * Get total unrealized P&L
   */
  getUnrealizedPnL(): number {
    let total = 0;
    for (const position of this.positions.values()) {
      total += position.getUnrealizedPnL();
    }
    return total;
  }

  /**
   * Get total unrealized P&L percentage
   */
  getUnrealizedPnLPercent(): number {
    const pnl = this.getUnrealizedPnL();
    if (this.capital === 0) return 0;
    return (pnl / this.capital) * 100;
  }

  /**
   * Get maximum drawdown from peak
   */
  getMaxDrawdown(): number {
    const currentValue = this.getTotalValue();
    if (this.peakValue === 0) return 0;
    return ((currentValue - this.peakValue) / this.peakValue) * 100;
  }

  /**
   * Check if circuit breaker triggered (-30% max drawdown per spec)
   */
  isCircuitBreakerHit(maxDrawdown: number = -30): boolean {
    return this.getMaxDrawdown() <= maxDrawdown;
  }

  /**
   * Add a position (buy)
   */
  addPosition(
    ticker: string,
    price: number,
    shares: number,
    score: number
  ): boolean {
    const cost = price * shares;

    // Check if we have enough cash
    if (cost > this.cash) {
      return false;
    }

    // If position exists, add to it
    if (this.positions.has(ticker)) {
      const existing = this.positions.get(ticker)!;
      const totalShares = existing.shares + shares;

      existing.shares = totalShares;
      existing.updatePrice(price);
    } else {
      this.positions.set(
        ticker,
        new Position({
          ticker,
          entryPrice: price,
          shares,
          currentPrice: price,
          entryScore: score,
          entryTimestamp: new Date(),
          peakPrice: price,
        })
      );
    }

    this.cash -= cost;

    // Record trade
    this.trades.recordTrade(ticker, 'BUY', price, shares, score);

    return true;
  }

  /**
   * Remove a position (sell)
   */
  removePosition(ticker: string, price: number): boolean {
    const position = this.positions.get(ticker);
    if (!position) return false;

    const proceeds = position.shares * price;
    this.cash += proceeds;

    // Record trade
    this.trades.recordTrade(
      ticker,
      'SELL',
      price,
      position.shares,
      position.entryScore
    );

    this.positions.delete(ticker);

    // Update peak value if needed
    const newValue = this.getTotalValue();
    if (newValue > this.peakValue) {
      this.peakValue = newValue;
    }

    return true;
  }

  /**
   * Rotate a position (sell old, buy new)
   */
  rotatePosition(
    oldTicker: string,
    oldPrice: number,
    newTicker: string,
    newPrice: number,
    newScore: number
  ): boolean {
    const position = this.positions.get(oldTicker);
    if (!position) return false;

    const shares = position.shares;
    const value = shares * oldPrice;

    // Check if new position costs are reasonable
    const newShares = Math.floor(value / newPrice);
    if (newShares === 0) return false;

    // Record old position sale
    this.trades.recordTrade(
      oldTicker,
      'ROTATION_OUT',
      oldPrice,
      shares,
      position.entryScore
    );

    // Record new position purchase
    this.trades.recordTrade(newTicker, 'ROTATION_IN', newPrice, newShares, newScore);

    // Execute rotation
    this.positions.delete(oldTicker);
    this.cash += value;

    const newCost = newShares * newPrice;
    this.cash -= newCost;

    this.positions.set(
      newTicker,
      new Position({
        ticker: newTicker,
        entryPrice: newPrice,
        shares: newShares,
        currentPrice: newPrice,
        entryScore: newScore,
        entryTimestamp: new Date(),
        peakPrice: newPrice,
      })
    );

    return true;
  }

  /**
   * Update prices for all positions
   */
  updatePrices(priceMap: Map<string, number>): void {
    for (const [ticker, position] of this.positions.entries()) {
      if (priceMap.has(ticker)) {
        position.updatePrice(priceMap.get(ticker)!);
      }
    }

    // Update peak value
    const newValue = this.getTotalValue();
    if (newValue > this.peakValue) {
      this.peakValue = newValue;
    }
  }

  /**
   * Get a specific position
   */
  getPosition(ticker: string): Position | undefined {
    return this.positions.get(ticker);
  }

  /**
   * Get all positions
   */
  getPositions(): Position[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get all tickers in portfolio
   */
  getTickers(): string[] {
    return Array.from(this.positions.keys());
  }

  /**
   * Get number of positions
   */
  getPositionCount(): number {
    return this.positions.size;
  }

  /**
   * Get trade history
   */
  getTrades(): Trade[] {
    return this.trades.getTrades() as Trade[];
  }

  /**
   * Convert to serializable object
   */
  toJSON(): PortfolioData {
    return {
      capital: this.capital,
      positions: Array.from(this.positions.values()).map((p) => p.toJSON()),
      cash: this.cash,
      peakValue: this.peakValue,
      trades: this.trades.getTrades() as Trade[],
    };
  }
}
