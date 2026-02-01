/**
 * Trade record - tracks individual buy/sell/rotation transactions
 * Links to spec Section 7 (Trade Execution)
 */
export class TradeRecord {
    constructor() {
        this.trades = [];
        this.nextId = 0;
    }
    /**
     * Record a new trade
     */
    recordTrade(ticker, type, price, shares, score, reason) {
        const trade = {
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
    getTrades() {
        return [...this.trades];
    }
    /**
     * Get trades for a specific ticker
     */
    getTradesForTicker(ticker) {
        return this.trades.filter((t) => t.ticker === ticker);
    }
    /**
     * Get trades of a specific type
     */
    getTradesOfType(type) {
        return this.trades.filter((t) => t.type === type);
    }
    /**
     * Get most recent trades (for diagnostics)
     */
    getRecentTrades(count) {
        return [...this.trades].reverse().slice(0, count);
    }
    /**
     * Clear trade history (for backtesting)
     */
    clear() {
        this.trades = [];
        this.nextId = 0;
    }
}
//# sourceMappingURL=trade.js.map