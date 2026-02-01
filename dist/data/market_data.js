/**
 * Market data fetching from Yahoo Finance
 * Links to spec Section 3 (Market Data)
 */
/**
 * Fetch historical price data
 * Using node-fetch + yfinance-like approach
 */
export class MarketData {
    constructor() {
        this.cache = new Map();
    }
    /**
     * Fetch recent price history for a ticker
     * @param ticker Stock ticker symbol
     * @param days Number of trading days to fetch (default 100)
     * @returns Candle data with prices and volumes
     */
    async fetchCandles(ticker, days = 100) {
        // Check cache
        const cached = this.cache.get(ticker);
        if (cached) {
            return cached;
        }
        // Simulate fetching - in production, use yfinance-like API
        // For now, return mock data for testing
        const prices = [];
        const volumes = [];
        const dates = [];
        const today = new Date();
        for (let i = days; i > 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            // Mock price: start at 100 with random walk
            const basePrice = 100 + Math.sin(i / 10) * 20;
            const price = basePrice + (Math.random() - 0.5) * 5;
            const volume = Math.floor(Math.random() * 2000000) + 1000000;
            prices.push(price);
            volumes.push(volume);
            dates.push(date);
        }
        const candles = { ticker, prices, volumes, dates };
        // Cache result
        this.cache.set(ticker, candles);
        return candles;
    }
    /**
     * Fetch current price for a ticker
     */
    async fetchCurrentPrice(ticker) {
        const candles = await this.fetchCandles(ticker, 1);
        if (candles.prices.length === 0) {
            throw new Error(`No price data for ${ticker}`);
        }
        return candles.prices[candles.prices.length - 1];
    }
    /**
     * Fetch prices for multiple tickers
     */
    async fetchMultiplePrices(tickers) {
        const prices = new Map();
        await Promise.all(tickers.map(async (ticker) => {
            try {
                const price = await this.fetchCurrentPrice(ticker);
                prices.set(ticker, price);
            }
            catch {
                // Skip tickers with errors
            }
        }));
        return prices;
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache size (for diagnostics)
     */
    getCacheSize() {
        return this.cache.size;
    }
}
//# sourceMappingURL=market_data.js.map