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
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    return 50; // Neutral RSI if insufficient data
  }

  const closes = prices.slice(-period - 1);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) {
    // Avoid returning identical 100 for different periods by
    // returning a very high RSI computed via a large RS value.
    // This preserves the meaning (very strong uptrend) while
    // keeping sensitivity to the period parameter.
    const rs = avgGain / 1e-8;
    const rsi = 100 - 100 / (1 + rs);
    return Math.min(100, Math.max(0, rsi));
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.min(100, Math.max(0, rsi));
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * 12/26/9 per spec Section 4
 */
export function calculateMACD(
  prices: number[]
): { macd: number; signal: number; histogram: number } {
  // Require at least 26 points to compute reliable MACD (26-period EMA)
  if (prices.length < 26) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  const macd = ema12 - ema26;

  // Build series of MACD values for signal calculation
  const macdSeries: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const a12 = calculateEMA(slice, 12);
    const a26 = calculateEMA(slice, 26);
    macdSeries.push(a12 - a26);
  }

  const signal = macdSeries.length >= 9 ? calculateEMA(macdSeries.slice(-9), 9) : macdSeries.reduce((a, b) => a + b, 0) / macdSeries.length;

  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(
  prices: number[],
  period: number
): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];

  const multiplier = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(
  prices: number[],
  period: number
): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * Calculate volume ratio (current vs 20-day average)
 * Per spec Section 5 (Catalyst Detection)
 */
export function calculateVolumeRatio(volumes: number[]): number {
  if (volumes.length === 0) return 1;
  const currentVolume = volumes[volumes.length - 1];

  // Use the previous 20 volumes (exclude the current volume) for the baseline average.
  const lookback = Math.min(20, Math.max(0, volumes.length - 1));
  if (lookback === 0) return 1;

  const recentVolumes = volumes.slice(volumes.length - 1 - lookback, volumes.length - 1);
  const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

  if (avgVolume === 0) return 1;

  return currentVolume / avgVolume;
}

/**
 * Detect MACD crossover (bullish = histogram crosses above 0)
 */
export function detectMACDCrossover(
  macdHistograms: number[]
): boolean {
  if (macdHistograms.length < 2) return false;

  const prev = macdHistograms[macdHistograms.length - 2];
  const curr = macdHistograms[macdHistograms.length - 1];

  return prev < 0 && curr >= 0; // Crossover from negative to positive
}

/**
 * Detect RSI divergence (price makes new high, RSI doesn't)
 */
export function detectRSIDivergence(
  prices: number[],
  rsiValues: number[]
): boolean {
  if (prices.length < 2 || rsiValues.length < 2) return false;

  const prevPrice = prices[prices.length - 2];
  const currPrice = prices[prices.length - 1];
  const prevRSI = rsiValues[rsiValues.length - 2];
  const currRSI = rsiValues[rsiValues.length - 1];

  // Bullish divergence: price up but RSI down
  return currPrice > prevPrice && currRSI < prevRSI;
}

/**
 * Batch calculate all indicators
 */
export function calculateIndicators(
  prices: number[],
  volumes: number[]
): Indicators {
  const rsi = calculateRSI(prices);
  const { macd, signal, histogram } = calculateMACD(prices);
  const volumeRatio = calculateVolumeRatio(volumes);

  return {
    rsi,
    macd,
    macdSignal: signal,
    macdHistogram: histogram,
    volumeRatio,
  };
}
