/**
 * Watchlist management
 */
export interface Watchlist {
    name: string;
    tickers: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class WatchlistManager {
    private watchlists;
    /**
     * Create or get a watchlist
     */
    getOrCreate(name: string): Watchlist;
    /**
     * Add ticker to watchlist
     */
    addTicker(name: string, ticker: string): void;
    /**
     * Remove ticker from watchlist
     */
    removeTicker(name: string, ticker: string): void;
    /**
     * Get all tickers in watchlist
     */
    getTickers(name: string): string[];
    /**
     * Load seed watchlist (default high-beta tickers)
     */
    loadSeedWatchlist(name?: string): string[];
}
//# sourceMappingURL=watchlist.d.ts.map