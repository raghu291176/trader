/**
 * Main Portfolio Rotation Agent Orchestrator
 * Links to spec Section 8 (Agent Workflow)
 */
import { Portfolio } from '../models/portfolio.js';
export interface AgentState {
    portfolio: Portfolio;
    watchlist: string[];
    scores: Map<string, number>;
    lastUpdate: Date;
}
export interface AgentOutput {
    state: AgentState;
    trades: any[];
    performance: {
        totalValue: number;
        cash: number;
        unrealizedPnL: number;
        unrealizedPnLPercent: number;
        maxDrawdown: number;
    };
}
export declare class PortfolioRotationAgent {
    private portfolio;
    private marketData;
    private watchlistManager;
    private scanner;
    private scorer;
    private rotationEngine;
    constructor(initialCapital?: number);
    /**
     * Initialize with default watchlist
     */
    initializeWatchlist(name?: string): string[];
    /**
     * Get current portfolio value
     */
    getPortfolioValue(): number;
    /**
     * Get portfolio positions
     */
    getPositions(): import("../models/position.js").Position[];
    /**
     * Run analysis pass without executing trades
     */
    analyzeWatchlist(watchlist: string[]): Promise<{
        scores: Map<string, number>;
        rotationDecisions: any[];
    }>;
    /**
     * Run trading pass (execute rotations)
     */
    runTradingPass(watchlist: string[]): Promise<{
        executedTrades: any[];
        portfolio: any;
    }>;
    /**
     * Get agent output for reporting
     */
    getAgentOutput(): AgentOutput;
}
//# sourceMappingURL=portfolio_rotation.d.ts.map