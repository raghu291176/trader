/**
 * Technical indicators: RSI, MACD, volume analysis
 * Links to spec Section 4 (Technical Indicators) and Section 5 (Catalyst Detection)
 */
export interface Indicators {
    rsi: number;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    volumeRatio: number;
}
/**
 * Calculate RSI (Relative Strength Index)
 * 14-period RSI per spec Section 4
 */
export declare function calculateRSI(prices: number[], period?: number): number;
/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * 12/26/9 per spec Section 4
 */
export declare function calculateMACD(prices: number[]): {
    macd: number;
    signal: number;
    histogram: number;
};
/**
 * Calculate EMA (Exponential Moving Average)
 */
export declare function calculateEMA(prices: number[], period: number): number;
/**
 * Calculate SMA (Simple Moving Average)
 */
export declare function calculateSMA(prices: number[], period: number): number;
/**
 * Calculate volume ratio (current vs 20-day average)
 * Per spec Section 5 (Catalyst Detection)
 */
export declare function calculateVolumeRatio(volumes: number[]): number;
/**
 * Detect MACD crossover (bullish = histogram crosses above 0)
 */
export declare function detectMACDCrossover(macdHistograms: number[]): boolean;
/**
 * Detect RSI divergence (price makes new high, RSI doesn't)
 */
export declare function detectRSIDivergence(prices: number[], rsiValues: number[]): boolean;
/**
 * Batch calculate all indicators
 */
export declare function calculateIndicators(prices: number[], volumes: number[]): Indicators;
//# sourceMappingURL=indicators.d.ts.map