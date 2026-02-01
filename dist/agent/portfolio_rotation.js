/**
 * Main Portfolio Rotation Agent Orchestrator
 * Links to spec Section 8 (Agent Workflow)
 */
import { Portfolio } from '../models/portfolio.js';
import { MarketData } from '../data/market_data.js';
import { WatchlistManager } from '../data/watchlist.js';
import { Scanner } from './scanner.js';
import { Scorer } from './scorer.js';
import { RotationEngine } from './rotation_engine.js';
export class PortfolioRotationAgent {
    constructor(initialCapital = 10000) {
        this.portfolio = new Portfolio(initialCapital);
        this.marketData = new MarketData();
        this.watchlistManager = new WatchlistManager();
        this.scanner = new Scanner();
        this.scorer = new Scorer();
        this.rotationEngine = new RotationEngine();
    }
    /**
     * Initialize with default watchlist
     */
    initializeWatchlist(name = 'default') {
        return this.watchlistManager.loadSeedWatchlist(name);
    }
    /**
     * Get current portfolio value
     */
    getPortfolioValue() {
        return this.portfolio.getTotalValue();
    }
    /**
     * Get portfolio positions
     */
    getPositions() {
        return this.portfolio.getPositions();
    }
    /**
     * Run analysis pass without executing trades
     */
    async analyzeWatchlist(watchlist) {
        const scores = new Map();
        // Fetch market data for all tickers
        const candlesList = await Promise.all(watchlist.map((ticker) => this.marketData.fetchCandles(ticker)));
        // Scan for catalysts
        const catalysts = this.scanner.scanMultiple(candlesList);
        // Score each ticker
        for (let i = 0; i < candlesList.length; i++) {
            const candles = candlesList[i];
            const catalyst = catalysts[i];
            const score = this.scorer.scoreTickerWithCandles(candles.ticker, candles, catalyst);
            scores.set(score.ticker, score.expectedReturn);
        }
        // Determine rotation decisions
        const rotationDecisions = this.rotationEngine.decideRotation(this.portfolio, new Map(Array.from(scores.entries()).map(([ticker, score]) => [
            ticker,
            { ticker, expectedReturn: score, components: {} },
        ])));
        return { scores, rotationDecisions };
    }
    /**
     * Run trading pass (execute rotations)
     */
    async runTradingPass(watchlist) {
        const { rotationDecisions } = await this.analyzeWatchlist(watchlist);
        // Fetch current prices
        const prices = await this.marketData.fetchMultiplePrices(watchlist);
        // Execute rotations
        const executedTrades = this.rotationEngine.executeMultipleRotations(this.portfolio, rotationDecisions, prices);
        return {
            executedTrades,
            portfolio: this.portfolio.toJSON(),
        };
    }
    /**
     * Get agent output for reporting
     */
    getAgentOutput() {
        const portfolio = this.portfolio;
        return {
            state: {
                portfolio: portfolio.toJSON(),
                watchlist: this.watchlistManager.getTickers('default'),
                scores: new Map(),
                lastUpdate: new Date(),
            },
            trades: portfolio.getTrades(),
            performance: {
                totalValue: portfolio.getTotalValue(),
                cash: portfolio.getCash(),
                unrealizedPnL: portfolio.getUnrealizedPnL(),
                unrealizedPnLPercent: portfolio.getUnrealizedPnLPercent(),
                maxDrawdown: portfolio.getMaxDrawdown(),
            },
        };
    }
}
//# sourceMappingURL=portfolio_rotation.js.map