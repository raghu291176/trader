/**
 * Portfolio state management
 * Tracks positions, cash, P&L, peak value
 * Links to spec Section 6 (Position Tracking)
 */
import { Position } from './position.js';
import { TradeRecord } from './trade.js';
export class Portfolio {
    constructor(initialCapital) {
        this.positions = new Map();
        this.capital = initialCapital;
        this.cash = initialCapital;
        this.peakValue = initialCapital;
        this.trades = new TradeRecord();
    }
    /**
     * Get total portfolio value
     */
    getTotalValue() {
        let positionValue = 0;
        for (const position of this.positions.values()) {
            positionValue += position.getValue();
        }
        return positionValue + this.cash;
    }
    /**
     * Get available cash
     */
    getCash() {
        return this.cash;
    }
    /**
     * Get total unrealized P&L
     */
    getUnrealizedPnL() {
        let total = 0;
        for (const position of this.positions.values()) {
            total += position.getUnrealizedPnL();
        }
        return total;
    }
    /**
     * Get total unrealized P&L percentage
     */
    getUnrealizedPnLPercent() {
        const pnl = this.getUnrealizedPnL();
        if (this.capital === 0)
            return 0;
        return (pnl / this.capital) * 100;
    }
    /**
     * Get maximum drawdown from peak
     */
    getMaxDrawdown() {
        const currentValue = this.getTotalValue();
        if (this.peakValue === 0)
            return 0;
        return ((currentValue - this.peakValue) / this.peakValue) * 100;
    }
    /**
     * Check if circuit breaker triggered (-30% max drawdown per spec)
     */
    isCircuitBreakerHit(maxDrawdown = -30) {
        return this.getMaxDrawdown() <= maxDrawdown;
    }
    /**
     * Add a position (buy)
     */
    addPosition(ticker, price, shares, score) {
        const cost = price * shares;
        // Check if we have enough cash
        if (cost > this.cash) {
            return false;
        }
        // If position exists, add to it
        if (this.positions.has(ticker)) {
            const existing = this.positions.get(ticker);
            const totalShares = existing.shares + shares;
            existing.shares = totalShares;
            existing.updatePrice(price);
        }
        else {
            this.positions.set(ticker, new Position({
                ticker,
                entryPrice: price,
                shares,
                currentPrice: price,
                entryScore: score,
                entryTimestamp: new Date(),
                peakPrice: price,
            }));
        }
        this.cash -= cost;
        // Record trade
        this.trades.recordTrade(ticker, 'BUY', price, shares, score);
        return true;
    }
    /**
     * Remove a position (sell)
     */
    removePosition(ticker, price) {
        const position = this.positions.get(ticker);
        if (!position)
            return false;
        const proceeds = position.shares * price;
        this.cash += proceeds;
        // Record trade
        this.trades.recordTrade(ticker, 'SELL', price, position.shares, position.entryScore);
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
    rotatePosition(oldTicker, oldPrice, newTicker, newPrice, newScore) {
        const position = this.positions.get(oldTicker);
        if (!position)
            return false;
        const shares = position.shares;
        const value = shares * oldPrice;
        // Check if new position costs are reasonable
        const newShares = Math.floor(value / newPrice);
        if (newShares === 0)
            return false;
        // Record old position sale
        this.trades.recordTrade(oldTicker, 'ROTATION_OUT', oldPrice, shares, position.entryScore);
        // Record new position purchase
        this.trades.recordTrade(newTicker, 'ROTATION_IN', newPrice, newShares, newScore);
        // Execute rotation
        this.positions.delete(oldTicker);
        this.cash += value;
        const newCost = newShares * newPrice;
        this.cash -= newCost;
        this.positions.set(newTicker, new Position({
            ticker: newTicker,
            entryPrice: newPrice,
            shares: newShares,
            currentPrice: newPrice,
            entryScore: newScore,
            entryTimestamp: new Date(),
            peakPrice: newPrice,
        }));
        return true;
    }
    /**
     * Update prices for all positions
     */
    updatePrices(priceMap) {
        for (const [ticker, position] of this.positions.entries()) {
            if (priceMap.has(ticker)) {
                position.updatePrice(priceMap.get(ticker));
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
    getPosition(ticker) {
        return this.positions.get(ticker);
    }
    /**
     * Get all positions
     */
    getPositions() {
        return Array.from(this.positions.values());
    }
    /**
     * Get all tickers in portfolio
     */
    getTickers() {
        return Array.from(this.positions.keys());
    }
    /**
     * Get number of positions
     */
    getPositionCount() {
        return this.positions.size;
    }
    /**
     * Get trade history
     */
    getTrades() {
        return this.trades.getTrades();
    }
    /**
     * Convert to serializable object
     */
    toJSON() {
        return {
            capital: this.capital,
            positions: Array.from(this.positions.values()).map((p) => p.toJSON()),
            cash: this.cash,
            peakValue: this.peakValue,
            trades: this.trades.getTrades(),
        };
    }
}
//# sourceMappingURL=portfolio.js.map