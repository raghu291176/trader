/**
 * TypeScript Types for Portfolio Rotation Agent API
 */

export interface Portfolio {
  totalValue: number;
  cash: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  maxDrawdown: number;
  positionCount: number;
}

export interface Position {
  ticker: string;
  shares: number;
  entryPrice: number;
  currentPrice: number;
  entryScore: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  value: number;
  entryTimestamp: string;
}

export interface Trade {
  type: 'BUY' | 'SELL';
  ticker: string;
  shares: number;
  price: number;
  timestamp: string;
  reason?: string;
  score?: number;
}

export interface Score {
  ticker: string;
  score: number;
  components: Record<string, number>;
}

export interface UserProfile {
  user_id: string;
  email?: string;
  full_name?: string;
  initial_capital: number;
  settings: Record<string, any>;
}

export interface Watchlist {
  id: number;
  name: string;
  tickers: string[];
}
