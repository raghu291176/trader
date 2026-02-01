/**
 * Scorer - Expected Return Calculation
 * Links to spec Section 5 (Multi-Factor Scoring)
 */
import { calculateIndicators, calculateSMA } from '../utils/indicators.js';
export class Scorer {
    /**
     * Score a ticker based on multi-factor model
     * Per spec Section 5: 40% catalyst + 30% momentum + 20% upside + 10% timing
     */
    scoreTickerWithCandles(ticker, candles, catalyst) {
        if (candles.prices.length < 26) {
            return {
                ticker,
                expectedReturn: 0,
                components: {
                    catalystScore: 0,
                    momentumScore: 0,
                    upsideScore: 0,
                    timingScore: 0,
                },
            };
        }
        const currentPrice = candles.prices[candles.prices.length - 1];
        const indicators = calculateIndicators(candles.prices, candles.volumes);
        // Component 1: Catalyst Score (40% weight)
        // Use aggregated catalyst signals
        const catalystScore = catalyst.aggregatedScore;
        // Component 2: Momentum Score (30% weight)
        // Combine RSI (normalized) and recent price performance
        const rsiNormalized = Math.max(0, Math.min(1, indicators.rsi / 100));
        const sma20 = calculateSMA(candles.prices, 20);
        const sma50 = calculateSMA(candles.prices, 50);
        const priceAboveMA = sma20 > 0
            ? Math.min(1, Math.max(0, (currentPrice - sma20) / (sma50 - sma20 + 0.001)))
            : 0;
        const momentumScore = rsiNormalized * 0.4 + priceAboveMA * 0.6;
        // Component 3: Upside Score (20% weight)
        // Estimate potential upside based on volatility and recent performance
        const high52 = Math.max(...candles.prices.slice(-260));
        const low52 = Math.min(...candles.prices.slice(-260));
        const distanceFromHigh = (high52 - currentPrice) / currentPrice;
        const volatilityRatio = (high52 - low52) / low52;
        // If price is well below high, upside potential exists
        const upsideScore = Math.min(1, Math.max(0, distanceFromHigh * 2 + volatilityRatio * 0.5));
        // Component 4: Timing Score (10% weight)
        // Measures how "hot" the stock is - recent volume, RSI momentum
        const volumeRatio = indicators.volumeRatio;
        const volumeScore = Math.min(1, volumeRatio / 2);
        // RSI moving direction (increasing = better timing)
        const recentRSI = calculateIndicators(candles.prices.slice(-30), candles.volumes.slice(-30)).rsi;
        const rsiMomentum = indicators.rsi > recentRSI ? (indicators.rsi - 50) / 50 : 0;
        const timingScore = volumeScore * 0.5 + Math.max(0, rsiMomentum) * 0.5;
        // Calculate weighted expected return
        const expectedReturn = catalystScore * 0.4 +
            momentumScore * 0.3 +
            upsideScore * 0.2 +
            timingScore * 0.1;
        return {
            ticker,
            expectedReturn: Math.min(1, Math.max(0, expectedReturn)),
            components: {
                catalystScore,
                momentumScore,
                upsideScore,
                timingScore,
            },
        };
    }
    /**
     * Apply momentum acceleration
     * Per spec: Higher score = more aggressively rotated
     */
    applyMomentumAcceleration(score) {
        if (score < 0.3) {
            return score * 0.8; // Depress low scores
        }
        else if (score > 0.7) {
            return score * 1.1; // Boost high scores
        }
        return score;
    }
    /**
     * Calculate rotation threshold
     * Per spec Section 7: Threshold = 0.02 for aggressive rotation
     */
    getRotationThreshold() {
        return 0.02; // 2% differential triggers rotation
    }
}
//# sourceMappingURL=scorer.js.map