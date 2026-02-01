/**
 * Individual position tracking
 * Links to spec Section 6 (Position Tracking)
 */
export class Position {
    constructor(data) {
        this.ticker = data.ticker;
        this.entryPrice = data.entryPrice;
        this.shares = data.shares;
        this.currentPrice = data.currentPrice;
        this.entryScore = data.entryScore;
        this.entryTimestamp = data.entryTimestamp;
        this.peakPrice = Math.max(data.currentPrice, data.entryPrice);
    }
    /**
     * Get unrealized P&L
     */
    getUnrealizedPnL() {
        return (this.currentPrice - this.entryPrice) * this.shares;
    }
    /**
     * Get unrealized P&L percentage
     */
    getUnrealizedPnLPercent() {
        if (this.entryPrice === 0)
            return 0;
        return ((this.currentPrice - this.entryPrice) / this.entryPrice) * 100;
    }
    /**
     * Get current position value
     */
    getValue() {
        return this.currentPrice * this.shares;
    }
    /**
     * Get maximum drawdown from peak
     */
    getDrawdown() {
        if (this.peakPrice === 0)
            return 0;
        return ((this.currentPrice - this.peakPrice) / this.peakPrice) * 100;
    }
    /**
     * Check if position hit stop-loss (-15% per spec)
     */
    isStopLossHit(stopLossPercent = -15) {
        return this.getUnrealizedPnLPercent() <= stopLossPercent;
    }
    /**
     * Update current price and peak
     */
    updatePrice(price) {
        this.currentPrice = price;
        this.peakPrice = Math.max(this.peakPrice, price);
    }
    /**
     * Convert to serializable object
     */
    toJSON() {
        return {
            ticker: this.ticker,
            entryPrice: this.entryPrice,
            shares: this.shares,
            currentPrice: this.currentPrice,
            entryScore: this.entryScore,
            entryTimestamp: this.entryTimestamp,
            peakPrice: this.peakPrice,
        };
    }
}
//# sourceMappingURL=position.js.map