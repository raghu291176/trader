/**
 * Individual position tracking
 * Links to spec Section 6 (Position Tracking)
 */
export interface PositionData {
    ticker: string;
    entryPrice: number;
    shares: number;
    currentPrice: number;
    entryScore: number;
    entryTimestamp: Date;
    peakPrice: number;
}
export declare class Position {
    ticker: string;
    entryPrice: number;
    shares: number;
    currentPrice: number;
    entryScore: number;
    entryTimestamp: Date;
    peakPrice: number;
    constructor(data: PositionData);
    /**
     * Get unrealized P&L
     */
    getUnrealizedPnL(): number;
    /**
     * Get unrealized P&L percentage
     */
    getUnrealizedPnLPercent(): number;
    /**
     * Get current position value
     */
    getValue(): number;
    /**
     * Get maximum drawdown from peak
     */
    getDrawdown(): number;
    /**
     * Check if position hit stop-loss (-15% per spec)
     */
    isStopLossHit(stopLossPercent?: number): boolean;
    /**
     * Update current price and peak
     */
    updatePrice(price: number): void;
    /**
     * Convert to serializable object
     */
    toJSON(): PositionData;
}
//# sourceMappingURL=position.d.ts.map