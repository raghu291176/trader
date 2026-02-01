/**
 * API Service - Handles all backend communication with authentication
 */

import axios, { AxiosInstance } from 'axios';
import type { Portfolio, Position, Trade, Score, UserProfile, Watchlist } from '../types';

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
}

export const apiService = new ApiService();
