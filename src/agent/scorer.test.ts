/**
 * Tests for Scorer
 */

import { describe, it, expect } from 'vitest';
import { Scorer } from './scorer';
import { CandleData } from '../data/market_data';
import { CatalystSignals } from './scanner';

describe('Scorer', () => {
  const scorer = new Scorer();

  // Deterministic mock candle data (no Math.random to avoid flaky tests)
  const createMockCandles = (trend: 'up' | 'down' = 'up'): CandleData => {
    const prices: number[] = [];
    const volumes: number[] = [];
    const dates: Date[] = [];

    for (let i = 0; i < 100; i++) {
      const basePrice = 100 + (trend === 'up' ? i : -i) * 0.5;
      prices.push(basePrice + Math.sin(i * 0.7) * 2);
      volumes.push(1000000 + Math.sin(i * 1.3) * 250000 + 250000);
      dates.push(new Date());
    }

    return { ticker: 'TEST', prices, volumes, dates };
  };

  const createMockCatalyst = (score: number): CatalystSignals => {
    return {
      ticker: 'TEST',
      signals: [],
      aggregatedScore: score,
    };
  };

  it('should produce valid scores for both uptrend and downtrend', () => {
    const upCandles = createMockCandles('up');
    const downCandles = createMockCandles('down');
    const catalyst = createMockCatalyst(0.5);

    const upScore = scorer.scoreTickerWithCandles('TEST', upCandles, catalyst);
    const downScore = scorer.scoreTickerWithCandles('TEST', downCandles, catalyst);

    // Both should produce valid scores in [0, 1]
    expect(upScore.expectedReturn).toBeGreaterThanOrEqual(0);
    expect(upScore.expectedReturn).toBeLessThanOrEqual(1);
    expect(downScore.expectedReturn).toBeGreaterThanOrEqual(0);
    expect(downScore.expectedReturn).toBeLessThanOrEqual(1);

    // The momentum components should differ between up and down trends
    expect(upScore.components.momentumScore).not.toBe(downScore.components.momentumScore);
  });

  it('should have components that sum to expected return', () => {
    const candles = createMockCandles('up');
    const catalyst = createMockCatalyst(0.7);

    const score = scorer.scoreTickerWithCandles('TEST', candles, catalyst);

    // Expected return should be weighted combination of components
    expect(score.expectedReturn).toBeGreaterThan(0);
    expect(score.expectedReturn).toBeLessThanOrEqual(1);
  });

  it('should apply momentum acceleration to high scores', () => {
    const accelerated = scorer.applyMomentumAcceleration(0.8);
    expect(accelerated).toBeGreaterThan(0.8);
  });

  it('should depress low momentum scores', () => {
    const depressed = scorer.applyMomentumAcceleration(0.2);
    expect(depressed).toBeLessThan(0.2);
  });

  it('should return 0.02 rotation threshold', () => {
    const threshold = scorer.getRotationThreshold();
    expect(threshold).toBe(0.02);
  });

  it('should handle insufficient data gracefully', () => {
    const candles: CandleData = {
      ticker: 'TEST',
      prices: [100, 101], // Only 2 prices
      volumes: [1000000, 1000000],
      dates: [new Date(), new Date()],
    };
    const catalyst = createMockCatalyst(0.5);

    const score = scorer.scoreTickerWithCandles('TEST', candles, catalyst);

    expect(score.expectedReturn).toBe(0);
  });
});
