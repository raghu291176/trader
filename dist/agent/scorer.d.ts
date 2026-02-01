/**
 * Scorer - Expected Return Calculation
 * Links to spec Section 5 (Multi-Factor Scoring)
 */
import { CatalystSignals } from './scanner.js';
import { CandleData } from '../data/market_data.js';
export interface Score {
    ticker: string;
    expectedReturn: number;
    components: ScoreComponents;
}
export interface ScoreComponents {
    catalystScore: number;
    momentumScore: number;
    upsideScore: number;
    timingScore: number;
}
export declare class Scorer {
    /**
     * Score a ticker based on multi-factor model
     * Per spec Section 5: 40% catalyst + 30% momentum + 20% upside + 10% timing
     */
    scoreTickerWithCandles(ticker: string, candles: CandleData, catalyst: CatalystSignals): Score;
    /**
     * Apply momentum acceleration
     * Per spec: Higher score = more aggressively rotated
     */
    applyMomentumAcceleration(score: number): number;
    /**
     * Calculate rotation threshold
     * Per spec Section 7: Threshold = 0.02 for aggressive rotation
     */
    getRotationThreshold(): number;
}
//# sourceMappingURL=scorer.d.ts.map