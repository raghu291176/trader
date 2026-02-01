/**
 * Position Sizer - Kelly Formula Implementation
 * Links to spec Section 6 (Position Sizing)
 */
export class PositionSizer {
    /**
     * Calculate position size using Kelly-inspired formula
     * Per spec Section 6: base_allocation(50%) + (score × 0.40), capped at 90%
     */
    calculatePositionSize(portfolioValue, currentPrice, score, minAllocation = 0.1, maxAllocation = 0.9) {
        // Base allocation is 50% of portfolio
        const baseAllocation = 0.5;
        // Score adjustment: up to 40% additional
        const scoreAdjustment = score * 0.4;
        // Final allocation with bounds
        let finalAllocation = baseAllocation + scoreAdjustment;
        finalAllocation = Math.max(minAllocation, Math.min(maxAllocation, finalAllocation));
        // Calculate number of shares
        const allocationAmount = portfolioValue * finalAllocation;
        const shares = Math.floor(allocationAmount / currentPrice);
        return {
            baseAllocation,
            scoreAdjustment,
            finalAllocation,
            shares,
        };
    }
    /**
     * Calculate Kelly fraction for position sizing
     * Classic Kelly: f = (bp - q) / b, where:
     * - b = odds (potential return multiple)
     * - p = win probability
     * - q = loss probability (1 - p)
     */
    calculateKellyFraction(expectedReturn, // Estimated return if trade works
    winProbability, maxLoss = 0.15) {
        const q = 1 - winProbability;
        const b = Math.max(0.5, expectedReturn / maxLoss);
        let kellyFraction = (b * winProbability - q) / b;
        // Use half-Kelly for safety
        kellyFraction = kellyFraction / 2;
        // Bound to reasonable range
        return Math.max(0.1, Math.min(0.9, kellyFraction));
    }
    /**
     * Calculate shares accounting for cash constraints
     */
    calculateSharesWithCash(cash, currentPrice, maxAllocationOfCash = 0.9) {
        const maxSpend = cash * maxAllocationOfCash;
        return Math.floor(maxSpend / currentPrice);
    }
    /**
     * Validate position size (is it within reasonable bounds?)
     */
    isValidSize(shares, price, portfolioValue) {
        if (shares <= 0)
            return false;
        const positionValue = shares * price;
        const allocation = positionValue / portfolioValue;
        // Check if within acceptable range
        return allocation >= 0.1 && allocation <= 0.9;
    }
}
//# sourceMappingURL=position_sizer.js.map