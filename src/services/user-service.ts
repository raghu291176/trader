/**
 * User Service - Manages user-specific portfolio agents
 * Each user gets their own isolated PortfolioRotationAgent instance
 */

import { PortfolioRotationAgent } from '../agent/portfolio_rotation.js';
import { neon } from '@neondatabase/serverless';

export interface UserProfile {
  user_id: string;
  email?: string;
  full_name?: string;
  initial_capital: number;
  created_at: Date;
  last_login?: Date;
  settings: Record<string, any>;
}

export class UserService {
  private agents: Map<string, PortfolioRotationAgent> = new Map();
  private sql: ReturnType<typeof neon>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  /**
   * Get or create agent for a specific user
   */
  async getUserAgent(userId: string): Promise<PortfolioRotationAgent> {
    // Check cache first
    if (this.agents.has(userId)) {
      return this.agents.get(userId)!;
    }

    // Get user profile to determine initial capital
    const profile = await this.getUserProfile(userId);
    const initialCapital = profile?.initial_capital || 10000;

    // Create new agent for this user
    const agent = new PortfolioRotationAgent(initialCapital);

    // TODO: Load user's portfolio state from database

    this.agents.set(userId, agent);
    return agent;
  }

  /**
   * Get user profile from database
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.sql`
        SELECT * FROM trader.users WHERE user_id = ${userId}
      `;

      if (Array.isArray(result) && result.length > 0) {
        return result[0] as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await this.sql`
        INSERT INTO trader.users (user_id, email, full_name, initial_capital, settings, last_login)
        VALUES (
          ${userId},
          ${data.email || null},
          ${data.full_name || null},
          ${data.initial_capital || 10000},
          ${JSON.stringify(data.settings || {})},
          NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          email = COALESCE(EXCLUDED.email, trader.users.email),
          full_name = COALESCE(EXCLUDED.full_name, trader.users.full_name),
          initial_capital = COALESCE(EXCLUDED.initial_capital, trader.users.initial_capital),
          settings = COALESCE(EXCLUDED.settings, trader.users.settings),
          last_login = NOW()
      `;
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  }

  /**
   * Get user's watchlists
   */
  async getUserWatchlists(userId: string): Promise<Array<{
    id: number;
    name: string;
    tickers: string[];
  }>> {
    try {
      const result = await this.sql`
        SELECT id, name, tickers FROM trader.watchlists
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      if (Array.isArray(result)) {
        return result as any;
      }
      return [];
    } catch (error) {
      console.error('Error fetching watchlists:', error);
      return [];
    }
  }

  /**
   * Save user watchlist
   */
  async saveWatchlist(userId: string, name: string, tickers: string[]): Promise<void> {
    try {
      await this.sql`
        INSERT INTO trader.watchlists (user_id, name, tickers, updated_at)
        VALUES (${userId}, ${name}, ${tickers}, NOW())
        ON CONFLICT (user_id, name) DO UPDATE SET
          tickers = EXCLUDED.tickers,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Error saving watchlist:', error);
      throw error;
    }
  }

  /**
   * Clear agent cache for a user (force reload)
   */
  clearUserAgent(userId: string): void {
    this.agents.delete(userId);
  }

  /**
   * Clear all agent caches
   */
  clearAllAgents(): void {
    this.agents.clear();
  }
}
