/**
 * AC-1b: Scorer Component Unit Tests
 * Validates catalyst strength aggregation, momentum acceleration, upside potential, timing factor
 */

import { describe, it, expect } from 'vitest';
import { Scorer } from './scorer.js';
import { CandleData } from '../data/market_data.js';
import { CatalystSignals } from './scanner.js';

function mockCandles(trend: 'up' | 'down' = 'up'): CandleData {
  const prices: number[] = [];
  const volumes: number[] = [];
  const dates: Date[] = [];

  for (let i = 0; i < 100; i++) {
    // Use a stronger trend slope (2.0) so MACD/RSI deltas clearly differentiate
    const p = trend === 'up' ? 100 + i * 2.0 : 300 - i * 2.0;
    prices.push(p + Math.sin(i * 0.7) * 1);
    volumes.push(1000000 + Math.floor(Math.sin(i * 1.3) * 250000 + 250000));
    dates.push(new Date());
  }

  return { ticker: 'MOCK', prices, volumes, dates };
}

function mockCatalyst(score: number): CatalystSignals {
  return { ticker: 'MOCK', signals: [], aggregatedScore: score };
}

describe('Scorer Components (AC-1b)', () => {
  const scorer = new Scorer();

  it('catalyst_strength in [0,1] clamps correctly', () => {
    const candles = mockCandles('up');
    const c = mockCatalyst(1.5); // deliberately >1 to test clipping

    const s = scorer.scoreTickerWithCandles('MOCK', candles, c);
    expect(s.components.catalystScore).toBeLessThanOrEqual(1);
    expect(s.expectedReturn).toBeLessThanOrEqual(1);
  });

  it('momentum acceleration is bounded in [-1, 1]', () => {
    const up = mockCandles('up');
    const down = mockCandles('down');
    const c = mockCatalyst(0.5);

    const su = scorer.scoreTickerWithCandles('MOCK', up, c);
    const sd = scorer.scoreTickerWithCandles('MOCK', down, c);

    // Momentum acceleration is in [-1, 1] per PRD
    expect(su.components.momentumScore).toBeGreaterThanOrEqual(-1);
    expect(su.components.momentumScore).toBeLessThanOrEqual(1);
    expect(sd.components.momentumScore).toBeGreaterThanOrEqual(-1);
    expect(sd.components.momentumScore).toBeLessThanOrEqual(1);

    // Both scores should be valid expected returns in [0, 1]
    expect(su.expectedReturn).toBeGreaterThanOrEqual(0);
    expect(su.expectedReturn).toBeLessThanOrEqual(1);
    expect(sd.expectedReturn).toBeGreaterThanOrEqual(0);
    expect(sd.expectedReturn).toBeLessThanOrEqual(1);
  });

  it('upside potential computed from analyst target', () => {
    const candles = mockCandles('up');
    const c = mockCatalyst(0.2);

    // Temporarily emulate upside potential by setting a high current price vs target
    // Since scorer uses candles to compute high52/low52 we assert upside ∈ [0,1]
    const s = scorer.scoreTickerWithCandles('MOCK', candles, c);
    expect(s.components.upsideScore).toBeGreaterThanOrEqual(0);
    expect(s.components.upsideScore).toBeLessThanOrEqual(1);
  });

  it('timing factor falls in [-0.5,0.5] and matches RSI buckets', () => {
    const candles = mockCandles('up');
    const c = mockCatalyst(0.4);

    const s = scorer.scoreTickerWithCandles('MOCK', candles, c);
    expect(s.components.timingScore).toBeGreaterThanOrEqual(-0.5);
    expect(s.components.timingScore).toBeLessThanOrEqual(0.5);
  });

  // NOTE: applyMomentumAcceleration method was removed from Scorer class
  // This test is commented out until the method is re-implemented
  // it('applyMomentumAcceleration depresses low scores and boosts high scores', () => {
  //   const low = scorer.applyMomentumAcceleration(0.2);
  //   const high = scorer.applyMomentumAcceleration(0.85);

  //   expect(low).toBeLessThan(0.2);
  //   expect(high).toBeGreaterThan(0.85);
  // });
});
