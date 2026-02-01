/**
 * Rotation Engine - Rotation Decision and Execution
 * Links to spec Section 7 (Rotation Logic)
 */
export class RotationEngine {
    constructor() {
        this.rotationThreshold = 0.02; // 2% differential per spec
        this.stopLossPercent = -15; // Per spec Section 6
        this.maxDrawdown = -30; // Circuit breaker per spec
    }
    /**
     * Decide whether to rotate based on score differentials
     * Per spec Section 7: Rotate if new score exceeds current by >2%
     */
    decideRotation(portfolio, scores) {
        const decisions = [];
        const positions = portfolio.getPositions();
        for (const position of positions) {
            // Check for stop-loss first
            if (position.isStopLossHit(this.stopLossPercent)) {
                decisions.push({
                    shouldRotate: true,
                    fromTicker: position.ticker,
                    reason: 'STOP_LOSS_HIT',
                });
                continue;
            }
            // Find best candidate to rotate into
            const currentScore = scores.get(position.ticker)?.expectedReturn ?? 0;
            let bestCandidate;
            let bestDifference = this.rotationThreshold;
            for (const [ticker, score] of scores.entries()) {
                // Don't rotate to a position already held
                if (portfolio.getTickers().includes(ticker)) {
                    continue;
                }
                const difference = score.expectedReturn - currentScore;
                if (difference > bestDifference) {
                    bestDifference = difference;
                    bestCandidate = score;
                }
            }
            if (bestCandidate && bestCandidate.expectedReturn > currentScore + this.rotationThreshold) {
                decisions.push({
                    shouldRotate: true,
                    fromTicker: position.ticker,
                    toTicker: bestCandidate.ticker,
                    reason: 'SCORE_DIFFERENTIAL',
                    scoreDifference: bestDifference,
                });
            }
        }
        // Check circuit breaker
        if (portfolio.isCircuitBreakerHit(this.maxDrawdown)) {
            // Force liquidation of all positions
            for (const position of positions) {
                decisions.push({
                    shouldRotate: true,
                    fromTicker: position.ticker,
                    reason: 'CIRCUIT_BREAKER',
                });
            }
        }
        return decisions;
    }
    /**
     * Execute a rotation decision
     */
    executeRotation(portfolio, decision, priceMap) {
        if (!decision.shouldRotate || !decision.fromTicker) {
            return { executed: false };
        }
        const fromPrice = priceMap.get(decision.fromTicker);
        if (!fromPrice) {
            return {
                executed: false,
                reason: `No price for ${decision.fromTicker}`,
            };
        }
        // Handle stop-loss or circuit breaker (close position)
        if (decision.reason === 'STOP_LOSS_HIT' || decision.reason === 'CIRCUIT_BREAKER') {
            const removed = portfolio.removePosition(decision.fromTicker, fromPrice);
            return {
                executed: removed,
                fromTicker: decision.fromTicker,
                reason: decision.reason,
            };
        }
        // Handle score-based rotation
        if (decision.toTicker && decision.reason === 'SCORE_DIFFERENTIAL') {
            const toPrice = priceMap.get(decision.toTicker);
            if (!toPrice) {
                return {
                    executed: false,
                    reason: `No price for ${decision.toTicker}`,
                };
            }
            const position = portfolio.getPosition(decision.fromTicker);
            if (!position) {
                return { executed: false };
            }
            // Calculate new shares
            const positionValue = position.shares * fromPrice;
            const newShares = Math.floor(positionValue / toPrice);
            if (newShares === 0) {
                return { executed: false, reason: 'Insufficient value for rotation' };
            }
            const rotated = portfolio.rotatePosition(decision.fromTicker, fromPrice, decision.toTicker, toPrice, 0 // Score will be updated in next iteration
            );
            return {
                executed: rotated,
                fromTicker: decision.fromTicker,
                toTicker: decision.toTicker,
                newShares,
            };
        }
        return { executed: false };
    }
    /**
     * Execute multiple rotations
     */
    executeMultipleRotations(portfolio, decisions, priceMap) {
        return decisions
            .map((decision) => this.executeRotation(portfolio, decision, priceMap))
            .filter((result) => result.executed);
    }
    /**
     * Get rotation statistics
     */
    getRotationStats(_portfolio, decisions) {
        const stopLosses = decisions.filter((d) => d.reason === 'STOP_LOSS_HIT').length;
        const rotations = decisions.filter((d) => d.reason === 'SCORE_DIFFERENTIAL').length;
        return {
            totalDecisions: decisions.length,
            rotations,
            stopLosses,
        };
    }
}
//# sourceMappingURL=rotation_engine.js.map