/**
 * Tests for Portfolio
 */

import { describe, it, expect } from 'vitest';
import { Portfolio } from './portfolio';

describe('Portfolio', () => {
  it('should initialize with correct capital and cash', () => {
    const portfolio = new Portfolio(10000);

    expect(portfolio.getTotalValue()).toBe(10000);
    expect(portfolio.getCash()).toBe(10000);
    expect(portfolio.getPositions().length).toBe(0);
  });

  it('should add positions and deduct cash', () => {
    const portfolio = new Portfolio(10000);

    const added = portfolio.addPosition('NVDA', 100, 50, 0.8);

    expect(added).toBe(true);
    expect(portfolio.getCash()).toBe(5000); // 10000 - (100 * 50)
    expect(portfolio.getPositions().length).toBe(1);
  });

  it('should refuse to add position without sufficient cash', () => {
    const portfolio = new Portfolio(10000);

    const added = portfolio.addPosition('NVDA', 100, 200, 0.8);

    expect(added).toBe(false);
    expect(portfolio.getCash()).toBe(10000);
  });

  it('should calculate unrealized P&L', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const position = portfolio.getPosition('NVDA')!;
    position.updatePrice(110); // Price went up

    const pnl = portfolio.getUnrealizedPnL();

    expect(pnl).toBeGreaterThan(0);
    expect(pnl).toBeCloseTo(50 * 10, 1); // 50 shares * $10 gain
  });

  it('should track maximum drawdown from peak', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const position = portfolio.getPosition('NVDA')!;
    position.updatePrice(110); // Peak at $110
    position.updatePrice(95); // Down to $95

    const drawdown = portfolio.getMaxDrawdown();

    expect(drawdown).toBeLessThan(0);
  });

  it('should detect stop-loss hit on positions', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const position = portfolio.getPosition('NVDA')!;
    position.updatePrice(85); // Down 15% from entry

    const isHit = position.isStopLossHit(-15);

    expect(isHit).toBe(true);
  });

  it('should remove positions and return cash', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);
    expect(portfolio.getCash()).toBe(5000);

    const position = portfolio.getPosition('NVDA')!;
    position.updatePrice(110);

    const removed = portfolio.removePosition('NVDA', 110);

    expect(removed).toBe(true);
    expect(portfolio.getCash()).toBeCloseTo(10500); // 5000 + (50 * 110)
    expect(portfolio.getPositions().length).toBe(0);
  });

  it('should rotate positions', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const rotated = portfolio.rotatePosition('NVDA', 100, 'AMD', 50, 0.9);

    expect(rotated).toBe(true);
    expect(portfolio.getTickers()).toContain('AMD');
    expect(portfolio.getTickers()).not.toContain('NVDA');
  });

  it('should serialize to JSON', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const json = portfolio.toJSON();

    expect(json.capital).toBe(10000);
    expect(json.positions.length).toBe(1);
    expect(json.cash).toBe(5000);
  });

  it('should detect circuit breaker at -30% drawdown', () => {
    const portfolio = new Portfolio(10000);

    portfolio.addPosition('NVDA', 100, 50, 0.8);

    const position = portfolio.getPosition('NVDA')!;
    position.updatePrice(110); // Peak at $110
    position.updatePrice(77); // Down 30% from peak

    const isHit = portfolio.isCircuitBreakerHit(-30);

    expect(isHit).toBe(true);
  });
});
