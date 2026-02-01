/**
 * Scorer - Expected Return Calculation
 * Links to PRD Section 4 (Scoring System - formal)
 *
 * Formula: expected_return = 0.40 × catalyst + 0.30 × momentum + 0.20 × upside + 0.10 × timing
 */

import { CatalystSignals } from './scanner.js';
import { calculateIndicators, calculateRSI, calculateMACD } from '../utils/indicators.js';
import { CandleData } from '../data/market_data.js';

export interface Score {
  ticker: string;
  expectedReturn: number;
  components: ScoreComponents;
}

export interface ScoreComponents {
  catalystScore: number; // 40% weight - [0,1]
  momentumScore: number; // 30% weight - [-1,1] normalized
  upsideScore: number; // 20% weight - [0,1]
  timingScore: number; // 10% weight - [-0.5,0.5] discrete
}

export class Scorer {
  /**
   * Score a ticker based on PRD multi-factor model
   * Per PRD Section 4: 40% catalyst + 30% momentum + 20% upside + 10% timing
   */
  scoreTickerWithCandles(
    ticker: string,
    candles: CandleData,
    catalyst: CatalystSignals,
    analystTargetPrice?: number
  ): Score {
    if (candles.prices.length < 50) {
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
    // PRD: catalyst_strength ∈ [0,1] is sum of triggered signal weights (clipped at 1)
    const catalystScore = Math.min(1.0, Math.max(0.0, catalyst.aggregatedScore));

    // Component 2: Momentum Acceleration (30% weight)
    // PRD: momentum_acceleration ∈ [-1,1] = normalized RSI delta + normalized MACD histogram delta
    const momentumScore = this.calculateMomentumAcceleration(candles);

    // Component 3: Upside Potential (20% weight)
    // PRD: upside_potential ∈ [0,1] = min(1.0, (analyst_target_price - current_price)/current_price)
    const upsideScore = this.calculateUpsidePotential(currentPrice, analystTargetPrice);

    // Component 4: Timing Factor (10% weight)
    // PRD: timing_factor ∈ [-0.5,0.5] with discrete buckets based on RSI/MACD
    const timingScore = this.calculateTimingFactor(indicators);

    // Calculate weighted expected return per PRD formula
    const expectedReturn =
      catalystScore * 0.4 +
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
   * Calculate momentum acceleration using RSI and MACD deltas
   * PRD: normalized RSI delta + normalized MACD histogram delta ∈ [-1, 1]
   */
  private calculateMomentumAcceleration(candles: CandleData): number {
    if (candles.prices.length < 30) return 0;

    // Calculate current RSI
    const currentRSI = calculateRSI(candles.prices, 14);

    // Calculate previous RSI (5 periods ago for meaningful delta)
    const prevPrices = candles.prices.slice(0, -5);
    const prevRSI = calculateRSI(prevPrices, 14);

    // RSI delta: range [-100, 100], normalize to [-1, 1]
    const rsiDelta = (currentRSI - prevRSI) / 100;

    // Calculate current and previous MACD histogram
    const currentMACD = calculateMACD(candles.prices);
    const prevMACD = calculateMACD(prevPrices);

    // MACD histogram delta (already in price units, normalize by typical range)
    const macdDelta = currentMACD.histogram - prevMACD.histogram;
    const normalizedMacdDelta = Math.max(-1, Math.min(1, macdDelta / 10)); // Assume ±10 is typical range

    // Combine: normalized RSI delta + normalized MACD delta, bounded to [-1, 1]
    const momentumAcceleration = (rsiDelta + normalizedMacdDelta) / 2;

    return Math.max(-1, Math.min(1, momentumAcceleration));
  }

  /**
   * Calculate upside potential using analyst target price
   * PRD: min(1.0, (analyst_target - current) / current)
   */
  private calculateUpsidePotential(currentPrice: number, analystTargetPrice?: number): number {
    if (!analystTargetPrice || analystTargetPrice <= 0) {
      // No analyst target available - use conservative estimate based on volatility
      return 0.1; // Conservative 10% upside when no target available
    }

    const upside = (analystTargetPrice - currentPrice) / currentPrice;
    return Math.min(1.0, Math.max(0.0, upside));
  }

  /**
   * Calculate timing factor using discrete RSI buckets
   * PRD Section 4:
   * - RSI 40–60 & MACD just crossed bullish: +0.5
   * - RSI 60–70 & MACD positive: +0.25
   * - RSI 70–75: 0
   * - RSI > 75 or MACD weakening: -0.5
   */
  private calculateTimingFactor(indicators: { rsi: number; macdHistogram: number; macd: number; macdSignal: number }): number {
    const rsi = indicators.rsi;
    const macdPositive = indicators.macdHistogram > 0;
    const macdBullish = indicators.macd > indicators.macdSignal;

    // Discrete bucket logic per PRD
    if (rsi >= 40 && rsi <= 60 && macdBullish) {
      return 0.5; // Early entry zone with bullish MACD
    } else if (rsi > 60 && rsi <= 70 && macdPositive) {
      return 0.25; // Momentum continuing
    } else if (rsi > 70 && rsi <= 75) {
      return 0; // Neutral - getting extended
    } else if (rsi > 75 || !macdPositive) {
      return -0.5; // Overbought or weakening
    } else {
      return 0; // Default neutral
    }
  }

  /**
   * Calculate rotation threshold
   * Per PRD Section 6: Threshold = 0.02 for aggressive rotation
   */
  getRotationThreshold(): number {
    return 0.02; // 2% differential triggers rotation
  }
}
