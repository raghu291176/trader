/**
 * Technical Indicators Service
 * Calculates technical indicators for quantitative analysis
 */

export interface PriceData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number; // Position within bands (0-1)
}

export interface MACD {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface RSI {
  value: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface Stochastic {
  k: number;
  d: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface TechnicalIndicators {
  bollinger: BollingerBands;
  macd: MACD;
  rsi: RSI;
  stochastic: Stochastic;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
}

export class TechnicalIndicatorsService {
  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(values: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(values: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value
    const sma = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(sma);

    // Calculate EMA for remaining values
    for (let i = period; i < values.length; i++) {
      const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }

    return ema;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[], mean: number): number {
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBands {
    const sma = this.calculateSMA(prices, period);
    const currentSMA = sma[sma.length - 1];

    const recentPrices = prices.slice(-period);
    const sd = this.calculateStdDev(recentPrices, currentSMA);

    const upper = currentSMA + (sd * stdDev);
    const lower = currentSMA - (sd * stdDev);
    const bandwidth = ((upper - lower) / currentSMA) * 100;

    const currentPrice = prices[prices.length - 1];
    const percentB = (currentPrice - lower) / (upper - lower);

    return {
      upper,
      middle: currentSMA,
      lower,
      bandwidth,
      percentB
    };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACD {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // MACD line
    const macdLine: number[] = [];
    const offset = slowPeriod - fastPeriod;
    for (let i = 0; i < slowEMA.length; i++) {
      macdLine.push(fastEMA[i + offset] - slowEMA[i]);
    }

    // Signal line
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    const macd = macdLine[macdLine.length - 1];
    const signal = signalLine[signalLine.length - 1];
    const histogram = macd - signal;

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (histogram > 0 && macd > 0) trend = 'bullish';
    else if (histogram < 0 && macd < 0) trend = 'bearish';

    return {
      macd,
      signal,
      histogram,
      trend
    };
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices: number[], period: number = 14): RSI {
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    const gains = changes.map(c => c > 0 ? c : 0);
    const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    if (rsi > 70) signal = 'overbought';
    else if (rsi < 30) signal = 'oversold';

    return {
      value: rsi,
      signal
    };
  }

  /**
   * Calculate Stochastic Oscillator
   */
  calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    kPeriod: number = 14,
    dPeriod: number = 3
  ): Stochastic {
    const kValues: number[] = [];

    for (let i = kPeriod - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
      const periodLows = lows.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...periodHighs);
      const lowestLow = Math.min(...periodLows);

      const k = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }

    const k = kValues[kValues.length - 1];
    const d = kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / Math.min(dPeriod, kValues.length);

    let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    if (k > 80 && d > 80) signal = 'overbought';
    else if (k < 20 && d < 20) signal = 'oversold';

    return {
      k,
      d,
      signal
    };
  }

  /**
   * Calculate all technical indicators
   */
  calculateAllIndicators(priceData: PriceData[]): TechnicalIndicators {
    const closes = priceData.map(p => p.close);
    const highs = priceData.map(p => p.high);
    const lows = priceData.map(p => p.low);

    const bollinger = this.calculateBollingerBands(closes);
    const macd = this.calculateMACD(closes);
    const rsi = this.calculateRSI(closes);
    const stochastic = this.calculateStochastic(highs, lows, closes);

    // Determine overall trend
    let trendScore = 0;
    if (macd.trend === 'bullish') trendScore += 1;
    if (macd.trend === 'bearish') trendScore -= 1;
    if (rsi.signal === 'oversold') trendScore += 0.5;
    if (rsi.signal === 'overbought') trendScore -= 0.5;
    if (stochastic.signal === 'oversold') trendScore += 0.5;
    if (stochastic.signal === 'overbought') trendScore -= 0.5;

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (trendScore > 0.5) trend = 'bullish';
    else if (trendScore < -0.5) trend = 'bearish';

    // Calculate strength (0-100)
    const strength = Math.min(100, Math.max(0,
      ((bollinger.percentB * 30) + (rsi.value * 0.3) + (stochastic.k * 0.4))
    ));

    return {
      bollinger,
      macd,
      rsi,
      stochastic,
      trend,
      strength
    };
  }
}
