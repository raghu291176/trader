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
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
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

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  watchlist: string[];
  maxPositions: number;
  positionSizePercent: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface BacktestPosition {
  ticker: string;
  shares: number;
  entryPrice: number;
  entryDate: string;
  exitPrice?: number;
  exitDate?: string;
  exitReason?: 'rebalance' | 'stop_loss' | 'take_profit' | 'end_of_period';
  pnl?: number;
  pnlPercent?: number;
}

export interface BacktestSnapshot {
  date: string;
  portfolioValue: number;
  cash: number;
  positions: BacktestPosition[];
  dailyReturn: number;
  cumulativeReturn: number;
}

export interface BacktestMetrics {
  totalReturn: number;
  totalReturnPercent: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  volatility: number;
  calmarRatio: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  snapshots: BacktestSnapshot[];
  closedPositions: BacktestPosition[];
  metrics: BacktestMetrics;
  benchmarkReturns?: { date: string; value: number; return: number }[];
}

export interface ChatAction {
  type: 'buy' | 'sell' | 'analyze' | 'rebalance';
  ticker?: string;
  label: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  actions?: ChatAction[];
  timestamp?: string;
}

// --- Paper Trading ---

export type PortfolioMode = 'paper' | 'live';

export interface GoLiveResponse {
  success: boolean;
  mode: 'live';
}

// --- Trade Orders ---

export interface TradeOrder {
  ticker: string;
  side: 'buy' | 'sell';
  shares: number;
}

export interface TradeResult {
  success: boolean;
  trade?: Trade;
  message: string;
}

// --- Leaderboard ---

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  returnPercent: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalUsers: number;
  page: number;
  totalPages: number;
}

export interface UserRank {
  rank: number;
  totalUsers: number;
  topPercent: number;
  returnPercent: number;
  period: LeaderboardPeriod;
  mode: PortfolioMode;
}

// --- Achievements ---

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  earnedAt: string | null;
  progress: number;
  progressTarget: number;
  progressCurrent: number;
}

// --- User Visibility ---

export interface UserVisibility {
  showOnLeaderboard: boolean;
  displayName: string;
}
