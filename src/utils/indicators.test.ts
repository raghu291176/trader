/**
 * AC-1a: Indicator Unit Tests
 * Validates RSI, MACD, EMA, SMA, and volume ratio calculations
 * Links to PRD Section 4 (Scoring System)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateSMA,
  calculateVolumeRatio,
  calculateIndicators,
} from './indicators.js';

describe('Indicators Module (AC-1a)', () => {
  // ===== RSI Tests =====

  describe('RSI (Relative Strength Index)', () => {
    it('should return 50 when insufficient data (< period+1)', () => {
      const prices = [100, 101, 102];
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBe(50); // Neutral default
    });

    it('should return RSI in range [0, 100] with valid data', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeGreaterThanOrEqual(0);
      expect(rsi).toBeLessThanOrEqual(100);
    });

    it('should return RSI > 50 for consistently uptrending prices', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeGreaterThan(50);
    });

    it('should return RSI < 50 for consistently downtrending prices', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeLessThan(50);
    });

    it('should return RSI 100 when all gains (no losses)', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115];
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBe(100);
    });

    it('should return RSI 0 when all losses (no gains)', () => {
      const prices = [115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBe(0);
    });

    it('should use custom period parameter', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const rsi7 = calculateRSI(prices, 7);
      const rsi14 = calculateRSI(prices, 14);
      expect(rsi7).not.toBe(rsi14);
    });
  });

  // ===== EMA Tests =====

  describe('EMA (Exponential Moving Average)', () => {
    it('should return 0 for empty prices', () => {
      const ema = calculateEMA([], 10);
      expect(ema).toBe(0);
    });

    it('should return price[0] for single price', () => {
      const ema = calculateEMA([100], 10);
      expect(ema).toBe(100);
    });

    it('should converge toward mean for constant prices', () => {
      const prices = Array(30).fill(100);
      const ema = calculateEMA(prices, 10);
      expect(ema).toBeCloseTo(100, 1);
    });

    it('should weight recent prices more heavily than older ones', () => {
      const prices = [100, 100, 100, 100, 200, 200, 200, 200];
      const ema = calculateEMA(prices, 3);
      expect(ema).toBeGreaterThan(150); // Biased toward recent 200s
    });

    it('should increase for uptrending prices', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const ema = calculateEMA(prices, 5);
      expect(ema).toBeGreaterThan(100);
    });
  });

  // ===== SMA Tests =====

  describe('SMA (Simple Moving Average)', () => {
    it('should return 0 for insufficient data', () => {
      const prices = [100, 101, 102];
      const sma = calculateSMA(prices, 10);
      expect(sma).toBe(0);
    });

    it('should calculate exact average for period length', () => {
      const prices = [100, 110, 120, 130, 140];
      const sma = calculateSMA(prices, 5);
      expect(sma).toBe(120); // (100+110+120+130+140) / 5
    });

    it('should use only recent `period` prices', () => {
      const prices = [10, 20, 30, 100, 110, 120];
      const sma = calculateSMA(prices, 3);
      expect(sma).toBe(110); // (100+110+120) / 3
    });

    it('should handle single-period SMA (last price)', () => {
      const prices = [100, 105, 110];
      const sma = calculateSMA(prices, 1);
      expect(sma).toBe(110);
    });
  });

  // ===== MACD Tests =====

  describe('MACD (Moving Average Convergence Divergence)', () => {
    it('should return zero values for insufficient data', () => {
      const prices = [100, 101, 102];
      const { macd, signal, histogram } = calculateMACD(prices);
      expect(macd).toBe(0);
      expect(signal).toBe(0);
      expect(histogram).toBe(0);
    });

    it('should return macd >= 0 for uptrending prices', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + i * 1.5);
      const { macd } = calculateMACD(prices);
      expect(macd).toBeGreaterThanOrEqual(0);
    });

    it('should return macd < 0 for downtrending prices', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 200 - i * 1.5);
      const { macd } = calculateMACD(prices);
      expect(macd).toBeLessThan(0);
    });

    it('should have histogram = macd - signal', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 5) * 10);
      const { macd, signal, histogram } = calculateMACD(prices);
      expect(histogram).toBeCloseTo(macd - signal, 5);
    });

    it('should handle constant prices (zero MACD)', () => {
      const prices = Array(40).fill(100);
      const { macd } = calculateMACD(prices);
      expect(macd).toBeCloseTo(0, 2);
    });
  });

  // ===== Volume Ratio Tests =====

  describe('Volume Ratio', () => {
    it('should return 1 for empty volumes', () => {
      const ratio = calculateVolumeRatio([]);
      expect(ratio).toBe(1);
    });

    it('should return current / average ratio', () => {
      const volumes = Array(20).fill(1000000);
      volumes[volumes.length - 1] = 2000000;
      const ratio = calculateVolumeRatio(volumes);
      expect(ratio).toBeCloseTo(2, 1); // 2M / 1M avg
    });

    it('should handle zero average (return 1)', () => {
      const volumes = Array(20).fill(0);
      volumes[volumes.length - 1] = 1000000;
      const ratio = calculateVolumeRatio(volumes);
      expect(ratio).toBe(1);
    });

    it('should use last 20 volumes for average', () => {
      const volumes = [
        ...Array(30).fill(1000000),
        ...Array(20).fill(500000), // Recent 20
      ];
      volumes[volumes.length - 1] = 2000000;
      const ratio = calculateVolumeRatio(volumes);
      // Current 2M / average of last 20 (~650K with one 2M)
      expect(ratio).toBeGreaterThan(1);
    });
  });

  // ===== Batch Calculation Tests =====

  describe('calculateIndicators (batch)', () => {
    it('should return all indicators in valid ranges', () => {
      const prices = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i / 10) * 20);
      const volumes = Array.from({ length: 40 }, () => 1000000 + Math.random() * 500000);

      const ind = calculateIndicators(prices, volumes);

      expect(ind.rsi).toBeGreaterThanOrEqual(0);
      expect(ind.rsi).toBeLessThanOrEqual(100);
      expect(ind.macd).toBeGreaterThanOrEqual(-100);
      expect(ind.macd).toBeLessThanOrEqual(100);
      expect(ind.macdSignal).toBeGreaterThanOrEqual(-100);
      expect(ind.macdSignal).toBeLessThanOrEqual(100);
      expect(ind.volumeRatio).toBeGreaterThan(0);
    });

    it('should correlate MACD histogram with trend direction', () => {
      const trendingPrices = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
      const volumes = Array(50).fill(1000000);

      const ind = calculateIndicators(trendingPrices, volumes);

      expect(ind.macdHistogram).toBeGreaterThanOrEqual(0);
    });

    it('should handle small dataset', () => {
      const prices = [100, 101, 102];
      const volumes = [1000000, 1000000, 1000000];

      const ind = calculateIndicators(prices, volumes);

      expect(ind).toBeDefined();
      expect(ind.rsi).toBe(50); // Default for insufficient data
    });
  });

  // ===== Integration Tests (AC-1a + PRD validation) =====

  describe('PRD Compliance (Section 4)', () => {
    it('AC-1a: RSI should be in [0, 100]', () => {
      const testCases = [
        Array.from({ length: 30 }, (_, i) => 100 + i),
        Array.from({ length: 30 }, (_, i) => 200 - i),
        Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i / 5) * 10),
      ];

      for (const prices of testCases) {
        const rsi = calculateRSI(prices, 14);
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      }
    });

    it('AC-1a: MACD histogram should cross zero at bullish crossover', () => {
      // Simulate MACD crossover: negative → positive histogram
      const prices = [
        ...Array(20).fill(100), // Flat (negative MACD)
        ...Array.from({ length: 20 }, (_, i) => 100 + i * 2), // Uptrend (positive MACD)
      ];

      const { macdHistogram } = calculateMACD(prices);

      expect(macdHistogram).toBeGreaterThanOrEqual(0); // Should be positive in trend
    });

    it('AC-1a: Volume surge should be detected when ratio > 1.5', () => {
      const volumes = Array(20).fill(1000000);
      volumes.push(2000000); // 2x surge

      const ratio = calculateVolumeRatio(volumes);

      expect(ratio).toBeGreaterThan(1.5);
    });
  });
});
