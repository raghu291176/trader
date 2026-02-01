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
export declare class TradeRecord {
    private trades;
    private nextId;
    /**
     * Record a new trade
     */
    recordTrade(ticker: string, type: Trade['type'], price: number, shares: number, score?: number, reason?: string): Trade;
    /**
     * Get all trades
     */
    getTrades(): readonly Trade[];
    /**
     * Get trades for a specific ticker
     */
    getTradesForTicker(ticker: string): Trade[];
    /**
     * Get trades of a specific type
     */
    getTradesOfType(type: Trade['type']): Trade[];
    /**
     * Get most recent trades (for diagnostics)
     */
    getRecentTrades(count: number): Trade[];
    /**
     * Clear trade history (for backtesting)
     */
    clear(): void;
}
//# sourceMappingURL=trade.d.ts.map