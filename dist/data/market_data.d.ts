/**
 * Market data fetching from Yahoo Finance
 * Links to spec Section 3 (Market Data)
 */
export interface PriceData {
    ticker: string;
    date: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    adjClose: number;
}
export interface CandleData {
    ticker: string;
    prices: number[];
    volumes: number[];
    dates: Date[];
}
/**
 * Fetch historical price data
 * Using node-fetch + yfinance-like approach
 */
export declare class MarketData {
    private cache;
    /**
     * Fetch recent price history for a ticker
     * @param ticker Stock ticker symbol
     * @param days Number of trading days to fetch (default 100)
     * @returns Candle data with prices and volumes
     */
    fetchCandles(ticker: string, days?: number): Promise<CandleData>;
    /**
     * Fetch current price for a ticker
     */
    fetchCurrentPrice(ticker: string): Promise<number>;
    /**
     * Fetch prices for multiple tickers
     */
    fetchMultiplePrices(tickers: string[]): Promise<Map<string, number>>;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Get cache size (for diagnostics)
     */
    getCacheSize(): number;
}
//# sourceMappingURL=market_data.d.ts.map