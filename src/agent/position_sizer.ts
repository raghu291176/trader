/**
 * Position Sizer - Kelly Formula Implementation
 * Links to spec Section 6 (Position Sizing)
 */

export interface PositionSizingResult {
  baseAllocation: number; // 50% base
  scoreAdjustment: number; // 40% of score
  finalAllocation: number; // Total (10-90% range)
  shares: number; // Calculated from allocation and price
}

export class PositionSizer {
  /**
   * Calculate position size using Kelly-inspired formula
   * Per spec Section 6: base_allocation(50%) + (score × 0.40), capped at 90%
   */
  calculatePositionSize(
    portfolioValue: number,
    currentPrice: number,
    score: number,
    minAllocation: number = 0.1,
    maxAllocation: number = 0.9
  ): PositionSizingResult {
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
  calculateKellyFraction(
    expectedReturn: number, // Estimated return if trade works
    winProbability: number,
    maxLoss: number = 0.15
  ): number {
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
  calculateSharesWithCash(
    cash: number,
    currentPrice: number,
    maxAllocationOfCash: number = 0.9
  ): number {
    const maxSpend = cash * maxAllocationOfCash;
    return Math.floor(maxSpend / currentPrice);
  }

  /**
   * Validate position size (is it within reasonable bounds?)
   */
  isValidSize(shares: number, price: number, portfolioValue: number): boolean {
    if (shares <= 0) return false;

    const positionValue = shares * price;
    const allocation = positionValue / portfolioValue;

    // Check if within acceptable range
    return allocation >= 0.1 && allocation <= 0.9;
  }
}
