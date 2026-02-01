/**
 * Scanner - Catalyst Detection
 * Links to spec Section 5 (Catalyst Detection)
 */

import { calculateIndicators } from '../utils/indicators.js';
import { CandleData } from '../data/market_data.js';

export interface CatalystSignals {
  ticker: string;
  signals: Signal[];
  aggregatedScore: number;
}

export interface Signal {
  type: string;
  weight: number;
  value: number;
}

export class Scanner {
  /**
   * Scan for catalysts in market data
   * Returns aggregated signal score per spec Section 5
   */
  scanCandles(candles: CandleData): CatalystSignals {
    const signals: Signal[] = [];

    if (candles.prices.length < 26) {
      // Insufficient data for indicators
      return {
        ticker: candles.ticker,
        signals,
        aggregatedScore: 0,
      };
    }

    const indicators = calculateIndicators(candles.prices, candles.volumes);

    // Signal 1: RSI Oversold Bounce (weight: 15%)
    if (indicators.rsi < 30) {
      signals.push({
        type: 'RSI_OVERSOLD_BOUNCE',
        weight: 0.15,
        value: (30 - indicators.rsi) / 30, // Normalize 0-1
      });
    }

    // Signal 2: MACD Bullish Crossover (weight: 25%)
    if (indicators.macdHistogram > 0 && indicators.macd > indicators.macdSignal) {
      signals.push({
        type: 'MACD_BULLISH_CROSSOVER',
        weight: 0.25,
        value: Math.min(
          1,
          indicators.macdHistogram / (Math.abs(indicators.macd) + 0.001)
        ),
      });
    }

    // Signal 3: Volume Spike (weight: 20%)
    if (indicators.volumeRatio > 1.5) {
      signals.push({
        type: 'VOLUME_SPIKE',
        weight: 0.2,
        value: Math.min(1, indicators.volumeRatio / 3),
      });
    }

    // Signal 4: Price Near 52-week Low (weight: 15%)
    const recentLow = Math.min(...candles.prices.slice(-260));
    const currentPrice = candles.prices[candles.prices.length - 1];
    const distanceFromLow = (currentPrice - recentLow) / recentLow;

    if (distanceFromLow < 0.15) {
      signals.push({
        type: 'PRICE_NEAR_LOW',
        weight: 0.15,
        value: 1 - distanceFromLow / 0.15,
      });
    }

    // Signal 5: Momentum (recent prices above 20-SMA, weight: 10%)
    const sma20 =
      candles.prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    if (currentPrice > sma20) {
      signals.push({
        type: 'MOMENTUM_UP',
        weight: 0.1,
        value: (currentPrice - sma20) / sma20,
      });
    }

    // Signal 6: Volatility Expansion (weight: 10%)
    const high52 = Math.max(...candles.prices.slice(-260));
    const low52 = Math.min(...candles.prices.slice(-260));
    const volatilityRatio = (high52 - low52) / low52;

    if (volatilityRatio > 0.5) {
      signals.push({
        type: 'VOLATILITY_EXPANSION',
        weight: 0.1,
        value: Math.min(1, volatilityRatio / 1.0),
      });
    }

    // Signal 7: RSI Above 70 (overbought but momentum, weight: 5%)
    if (indicators.rsi > 70) {
      signals.push({
        type: 'RSI_OVERBOUGHT_MOMENTUM',
        weight: 0.05,
        value: (indicators.rsi - 70) / 30,
      });
    }

    // Calculate aggregated score
    const aggregatedScore = signals.reduce(
      (sum, signal) => sum + signal.weight * signal.value,
      0
    );

    return {
      ticker: candles.ticker,
      signals,
      aggregatedScore: Math.min(1, aggregatedScore),
    };
  }

  /**
   * Scan multiple tickers
   */
  scanMultiple(candlesList: CandleData[]): CatalystSignals[] {
    return candlesList.map((candles) => this.scanCandles(candles));
  }
}
