/**
 * Tests for PositionSizer
 */

import { describe, it, expect } from 'vitest';
import { PositionSizer } from './position_sizer';

describe('PositionSizer', () => {
  const sizer = new PositionSizer();

  it('should calculate position size with base + score adjustment', () => {
    const result = sizer.calculatePositionSize(
      10000, // Portfolio value
      100, // Current price
      0.8 // Score
    );

    expect(result.baseAllocation).toBe(0.5);
    expect(result.scoreAdjustment).toBe(0.8 * 0.4); // 0.32
    expect(result.finalAllocation).toBeCloseTo(0.82, 2);
    expect(result.shares).toBe(82); // 10000 * 0.82 / 100
  });

  it('should cap allocation at 90%', () => {
    const result = sizer.calculatePositionSize(10000, 100, 1.0);

    expect(result.finalAllocation).toBeLessThanOrEqual(0.9);
  });

  it('should enforce minimum allocation of 10%', () => {
    const result = sizer.calculatePositionSize(10000, 100, 0);

    expect(result.finalAllocation).toBeGreaterThanOrEqual(0.1);
  });

  it('should calculate valid Kelly fraction', () => {
    const kelly = sizer.calculateKellyFraction(
      0.5, // Expected return 50%
      0.6, // Win probability 60%
      0.15 // Max loss 15%
    );

    expect(kelly).toBeGreaterThanOrEqual(0.1);
    expect(kelly).toBeLessThanOrEqual(0.9);
  });

  it('should validate position sizes', () => {
    const valid = sizer.isValidSize(
      100, // 100 shares
      100, // at $100
      10000 // with $10k portfolio = 1% allocation (valid)
    );

    expect(valid).toBe(true);

    const invalid = sizer.isValidSize(
      0, // 0 shares (invalid)
      100,
      10000
    );

    expect(invalid).toBe(false);
  });

  it('should calculate shares respecting cash constraints', () => {
    const shares = sizer.calculateSharesWithCash(
      5000, // Cash available
      100, // Price per share
      0.9 // Use up to 90% of cash
    );

    expect(shares).toBe(45); // 5000 * 0.9 / 100
  });
});
