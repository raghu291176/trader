/**
 * Scanner - Catalyst Detection
 * Links to spec Section 5 (Catalyst Detection)
 */
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
export declare class Scanner {
    /**
     * Scan for catalysts in market data
     * Returns aggregated signal score per spec Section 5
     */
    scanCandles(candles: CandleData): CatalystSignals;
    /**
     * Scan multiple tickers
     */
    scanMultiple(candlesList: CandleData[]): CatalystSignals[];
}
//# sourceMappingURL=scanner.d.ts.map