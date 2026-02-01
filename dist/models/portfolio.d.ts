/**
 * Portfolio state management
 * Tracks positions, cash, P&L, peak value
 * Links to spec Section 6 (Position Tracking)
 */
import { Position, PositionData } from './position.js';
import { Trade } from './trade.js';
export interface PortfolioData {
    capital: number;
    positions: PositionData[];
    cash: number;
    peakValue: number;
    trades: Trade[];
}
export declare class Portfolio {
    private positions;
    private capital;
    private cash;
    private peakValue;
    private trades;
    constructor(initialCapital: number);
    /**
     * Get total portfolio value
     */
    getTotalValue(): number;
    /**
     * Get available cash
     */
    getCash(): number;
    /**
     * Get total unrealized P&L
     */
    getUnrealizedPnL(): number;
    /**
     * Get total unrealized P&L percentage
     */
    getUnrealizedPnLPercent(): number;
    /**
     * Get maximum drawdown from peak
     */
    getMaxDrawdown(): number;
    /**
     * Check if circuit breaker triggered (-30% max drawdown per spec)
     */
    isCircuitBreakerHit(maxDrawdown?: number): boolean;
    /**
     * Add a position (buy)
     */
    addPosition(ticker: string, price: number, shares: number, score: number): boolean;
    /**
     * Remove a position (sell)
     */
    removePosition(ticker: string, price: number): boolean;
    /**
     * Rotate a position (sell old, buy new)
     */
    rotatePosition(oldTicker: string, oldPrice: number, newTicker: string, newPrice: number, newScore: number): boolean;
    /**
     * Update prices for all positions
     */
    updatePrices(priceMap: Map<string, number>): void;
    /**
     * Get a specific position
     */
    getPosition(ticker: string): Position | undefined;
    /**
     * Get all positions
     */
    getPositions(): Position[];
    /**
     * Get all tickers in portfolio
     */
    getTickers(): string[];
    /**
     * Get number of positions
     */
    getPositionCount(): number;
    /**
     * Get trade history
     */
    getTrades(): Trade[];
    /**
     * Convert to serializable object
     */
    toJSON(): PortfolioData;
}
//# sourceMappingURL=portfolio.d.ts.map