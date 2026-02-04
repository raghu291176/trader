/**
 * API Service - Handles all backend communication
 */

import axios, { AxiosInstance } from 'axios';
import type { Portfolio, Position, Trade, Score, UserProfile, Watchlist } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });
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

  async getPoliticianTrades(ticker: string): Promise<any[]> {
    const { data } = await this.client.get(`/market/${ticker}/politician-trades`);
    return data;
  }

  async getTechnicalIndicators(ticker: string): Promise<any> {
    const { data } = await this.client.get(`/market/${ticker}/indicators`);
    return data;
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
}

export const apiService = new ApiService();
