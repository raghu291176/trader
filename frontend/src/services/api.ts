/**
 * API Service - Handles all backend communication with authentication
 */

import axios, { AxiosInstance } from 'axios';
import type { Portfolio, Position, Trade, Score, UserProfile, Watchlist, PortfolioMode, TradeOrder, TradeResult, LeaderboardResponse, LeaderboardPeriod, UserRank, Achievement, UserVisibility, GoLiveResponse } from '../types';

class ApiService {
  private client: AxiosInstance;
  private getToken?: () => Promise<string | null>;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(async (config) => {
      if (this.getToken) {
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });
  }

  /**
   * Set function to retrieve Clerk auth token
   */
  setTokenGetter(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  /**
   * Portfolio endpoints
   */
  async getPortfolio(): Promise<Portfolio> {
    const { data } = await this.client.get<Portfolio>('/portfolio');
    return data;
  }

  async getPositions(): Promise<Position[]> {
    const { data } = await this.client.get<Position[]>('/positions');
    return data;
  }

  async getTrades(): Promise<Trade[]> {
    const { data } = await this.client.get<Trade[]>('/trades');
    return data;
  }

  /**
   * Analysis endpoints
   */
  async getScores(): Promise<Score[]> {
    const { data } = await this.client.get<Score[]>('/scores');
    return data;
  }

  async analyzeWatchlist(watchlist: string[]): Promise<{
    scores: Score[];
    rotationDecisions: any[];
  }> {
    const { data } = await this.client.post('/analyze', { watchlist });
    return data;
  }

  async executeRotation(): Promise<{
    portfolio: Pick<Portfolio, 'totalValue' | 'cash' | 'unrealizedPnL' | 'unrealizedPnLPercent'>;
    trades: Trade[];
  }> {
    const { data } = await this.client.post('/execute');
    return data;
  }

  /**
   * User management endpoints
   */
  async getUserProfile(): Promise<UserProfile> {
    const { data} = await this.client.get<UserProfile>('/user/profile');
    return data;
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
    await this.client.put('/user/profile', profile);
  }

  async getWatchlists(): Promise<Watchlist[]> {
    const { data } = await this.client.get<Watchlist[]>('/user/watchlists');
    return data;
  }

  async saveWatchlist(name: string, tickers: string[]): Promise<void> {
    await this.client.post('/user/watchlists', { name, tickers });
  }

  /**
   * Market data endpoints
   */
  async getTickerAnalysis(ticker: string): Promise<any> {
    const { data } = await this.client.get(`/market/${ticker}`);
    return data;
  }

  async getRecommendations(ticker: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/recommendations`);
    return data;
  }

  async getPriceTarget(ticker: string): Promise<any> {
    const { data } = await this.client.get(`/market/${ticker}/price-target`);
    return data;
  }

  async getNews(ticker: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/news`);
    return data;
  }

  async getEarnings(ticker: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/earnings`);
    return data;
  }

  async getChartData(ticker: string, timeframe: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/chart?timeframe=${timeframe}`);
    return data;
  }

  async getPoliticianTrades(politicianName: string, limit: number = 10): Promise<any> {
    const { data } = await this.client.get(`/politician/${encodeURIComponent(politicianName)}/trades?limit=${limit}`);
    return data;
  }

  async getPoliticianTradesForTicker(ticker: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/politician-trades`);
    return data;
  }

  async getTechnicalIndicators(ticker: string): Promise<any> {
    const { data } = await this.client.get(`/market/${ticker}/indicators`);
    return data;
  }

  /**
   * Get latest stock data snapshot (real-time timeseries data)
   */
  async getStockSnapshot(ticker: string): Promise<any> {
    const { data } = await this.client.get(`/market/${ticker}/snapshot`);
    return data;
  }

  /**
   * Manually trigger data ingestion for a ticker
   */
  async ingestStockData(ticker: string): Promise<void> {
    await this.client.post(`/market/${ticker}/ingest`);
  }

  /**
   * Backtesting endpoints
   */
  async runBacktest(config: any): Promise<any> {
    const { data } = await this.client.post('/backtest', config);
    return data;
  }

  async compareBacktests(configs: any[]): Promise<any[]> {
    const { data } = await this.client.post('/backtest/compare', { configs });
    return data;
  }

  /**
   * Chat endpoints
   */
  async chat(question: string, ticker?: string): Promise<{
    answer: string;
    sources: string[];
    actions?: Array<{ type: string; ticker?: string; label: string }>;
    timestamp: string;
  }> {
    const { data } = await this.client.post('/chat', { question, ticker });
    return data;
  }

  async getChatSuggestions(): Promise<string[]> {
    const { data } = await this.client.get<{ suggestions: string[] }>('/chat/suggestions');
    return data.suggestions;
  }

  /**
   * Trade order placement
   */
  async placeTrade(order: TradeOrder): Promise<TradeResult> {
    const { data } = await this.client.post<TradeResult>('/execute', order);
    return data;
  }

  /**
   * Paper trading endpoints
   */
  async createPaperPortfolio(): Promise<{ id: string; virtualCapital: number }> {
    const { data } = await this.client.post('/portfolio/paper');
    return data;
  }

  async goLive(confirmationText: string): Promise<GoLiveResponse> {
    const { data } = await this.client.post<GoLiveResponse>('/portfolio/go-live', { confirmationText });
    return data;
  }

  async getPortfolioMode(): Promise<{ mode: PortfolioMode }> {
    const { data } = await this.client.get<{ mode: PortfolioMode }>('/portfolio/mode');
    return data;
  }

  /**
   * Leaderboard endpoints
   */
  async getLeaderboard(mode: PortfolioMode, period: LeaderboardPeriod, page: number = 1): Promise<LeaderboardResponse> {
    const { data } = await this.client.get<LeaderboardResponse>(`/leaderboard?mode=${mode}&period=${period}&page=${page}`);
    return data;
  }

  async getMyRank(mode: PortfolioMode, period: LeaderboardPeriod): Promise<UserRank> {
    const { data } = await this.client.get<UserRank>(`/leaderboard/me?mode=${mode}&period=${period}`);
    return data;
  }

  /**
   * Achievements endpoints
   */
  async getMyAchievements(): Promise<Achievement[]> {
    const { data } = await this.client.get<Achievement[]>('/achievements/me');
    return data;
  }

  /**
   * User visibility endpoints
   */
  async updateVisibility(visibility: UserVisibility): Promise<void> {
    await this.client.put('/user/profile/visibility', visibility);
  }

  async getVisibility(): Promise<UserVisibility> {
    const { data } = await this.client.get<UserVisibility>('/user/profile/visibility');
    return data;
  }
}

export const apiService = new ApiService();
