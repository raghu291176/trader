/**
 * Rotation Engine - Rotation Decision and Execution
 * Links to spec Section 7 (Rotation Logic)
 */
import { Portfolio } from '../models/portfolio.js';
import { Score } from './scorer.js';
export interface RotationDecision {
    shouldRotate: boolean;
    fromTicker?: string;
    toTicker?: string;
    reason?: string;
    scoreDifference?: number;
}
export interface RotationExecutionResult {
    executed: boolean;
    fromTicker?: string;
    toTicker?: string;
    reason?: string;
    newShares?: number;
}
export declare class RotationEngine {
    private rotationThreshold;
    private stopLossPercent;
    private maxDrawdown;
    /**
     * Decide whether to rotate based on score differentials
     * Per spec Section 7: Rotate if new score exceeds current by >2%
     */
    decideRotation(portfolio: Portfolio, scores: Map<string, Score>): RotationDecision[];
    /**
     * Execute a rotation decision
     */
    executeRotation(portfolio: Portfolio, decision: RotationDecision, priceMap: Map<string, number>): RotationExecutionResult;
    /**
     * Execute multiple rotations
     */
    executeMultipleRotations(portfolio: Portfolio, decisions: RotationDecision[], priceMap: Map<string, number>): RotationExecutionResult[];
    /**
     * Get rotation statistics
     */
    getRotationStats(_portfolio: Portfolio, decisions: RotationDecision[]): {
        totalDecisions: number;
        rotations: number;
        stopLosses: number;
    };
}
//# sourceMappingURL=rotation_engine.d.ts.map