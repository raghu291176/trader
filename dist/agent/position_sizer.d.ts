/**
 * Position Sizer - Kelly Formula Implementation
 * Links to spec Section 6 (Position Sizing)
 */
export interface PositionSizingResult {
    baseAllocation: number;
    scoreAdjustment: number;
    finalAllocation: number;
    shares: number;
}
export declare class PositionSizer {
    /**
     * Calculate position size using Kelly-inspired formula
     * Per spec Section 6: base_allocation(50%) + (score × 0.40), capped at 90%
     */
    calculatePositionSize(portfolioValue: number, currentPrice: number, score: number, minAllocation?: number, maxAllocation?: number): PositionSizingResult;
    /**
     * Calculate Kelly fraction for position sizing
     * Classic Kelly: f = (bp - q) / b, where:
     * - b = odds (potential return multiple)
     * - p = win probability
     * - q = loss probability (1 - p)
     */
    calculateKellyFraction(expectedReturn: number, // Estimated return if trade works
    winProbability: number, maxLoss?: number): number;
    /**
     * Calculate shares accounting for cash constraints
     */
    calculateSharesWithCash(cash: number, currentPrice: number, maxAllocationOfCash?: number): number;
    /**
     * Validate position size (is it within reasonable bounds?)
     */
    isValidSize(shares: number, price: number, portfolioValue: number): boolean;
}
//# sourceMappingURL=position_sizer.d.ts.map