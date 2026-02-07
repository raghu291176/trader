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

  // ─── Visibility ──────────────────────────────────────────

  async getVisibility(userId: string): Promise<{ showOnLeaderboard: boolean; displayName: string }> {
    try {
      const result = await this.sql`
        SELECT show_on_leaderboard, display_name FROM trader.user_visibility
        WHERE user_id = ${userId}
      `;
      if (Array.isArray(result) && result.length > 0) {
        return {
          showOnLeaderboard: (result[0] as any).show_on_leaderboard ?? true,
          displayName: (result[0] as any).display_name || '',
        };
      }
      return { showOnLeaderboard: true, displayName: '' };
    } catch {
      return { showOnLeaderboard: true, displayName: '' };
    }
  }

  async updateVisibility(userId: string, data: { showOnLeaderboard: boolean; displayName: string }): Promise<void> {
    try {
      await this.sql`
        INSERT INTO trader.user_visibility (user_id, show_on_leaderboard, display_name, updated_at)
        VALUES (${userId}, ${data.showOnLeaderboard}, ${data.displayName || null}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          show_on_leaderboard = EXCLUDED.show_on_leaderboard,
          display_name = EXCLUDED.display_name,
          updated_at = NOW()
      `;
    } catch (error) {
      console.error('Error updating visibility:', error);
      throw error;
    }
  }

  // ─── Portfolio Mode ──────────────────────────────────────

  async getPortfolioMode(userId: string): Promise<{ mode: 'paper' | 'live' }> {
    try {
      const result = await this.sql`
        SELECT mode FROM trader.user_portfolio_mode
        WHERE user_id = ${userId}
      `;
      if (Array.isArray(result) && result.length > 0) {
        return { mode: (result[0] as any).mode as 'paper' | 'live' };
      }
      return { mode: 'paper' };
    } catch {
      return { mode: 'paper' };
    }
  }

  async createPaperPortfolio(userId: string): Promise<{ id: string; virtualCapital: number }> {
    try {
      await this.sql`
        INSERT INTO trader.user_portfolio_mode (user_id, mode, paper_capital, updated_at)
        VALUES (${userId}, 'paper', 100000, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          mode = 'paper',
          paper_capital = 100000,
          updated_at = NOW()
      `;
      return { id: userId, virtualCapital: 100000 };
    } catch (error) {
      console.error('Error creating paper portfolio:', error);
      throw error;
    }
  }

  async goLive(userId: string, confirmationText: string): Promise<{ success: boolean; mode: 'live' }> {
    if (confirmationText !== 'GO LIVE') {
      throw new Error('Invalid confirmation text');
    }
    try {
      await this.sql`
        INSERT INTO trader.user_portfolio_mode (user_id, mode, switched_to_live_at, updated_at)
        VALUES (${userId}, 'live', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          mode = 'live',
          switched_to_live_at = NOW(),
          updated_at = NOW()
      `;
      return { success: true, mode: 'live' };
    } catch (error) {
      console.error('Error switching to live:', error);
      throw error;
    }
  }

  // ─── Leaderboard ─────────────────────────────────────────

  async getLeaderboard(mode: string, period: string, page: number = 1, pageSize: number = 20): Promise<{
    entries: any[];
    totalUsers: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Count total visible users
      const countResult = await this.sql`
        SELECT COUNT(*) as total FROM trader.users u
        LEFT JOIN trader.user_visibility v ON v.user_id = u.user_id
        WHERE COALESCE(v.show_on_leaderboard, true) = true
      `;
      const totalUsers = parseInt((countResult as any)[0]?.total || '0', 10);
      const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));
      const offset = (page - 1) * pageSize;

      // Get ranked users (ordered by capital/value)
      const entries = await this.sql`
        SELECT
          u.user_id,
          COALESCE(v.display_name, u.full_name, 'Anonymous') as display_name,
          COALESCE(u.initial_capital, 10000) as initial_capital,
          u.settings
        FROM trader.users u
        LEFT JOIN trader.user_visibility v ON v.user_id = u.user_id
        WHERE COALESCE(v.show_on_leaderboard, true) = true
        ORDER BY COALESCE(u.initial_capital, 10000) DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      const rankedEntries = (entries as any[]).map((row: any, i: number) => ({
        rank: offset + i + 1,
        displayName: row.display_name,
        returnPercent: Math.random() * 40 - 10, // Placeholder: would need trade history calc
        sharpeRatio: Math.random() * 3,
        winRate: 40 + Math.random() * 30,
        totalTrades: Math.floor(Math.random() * 50),
        isCurrentUser: false, // Caller sets this
      }));

      return { entries: rankedEntries, totalUsers, page, totalPages };
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return { entries: [], totalUsers: 0, page: 1, totalPages: 1 };
    }
  }

  async getUserRank(userId: string, mode: string, period: string): Promise<{
    rank: number;
    totalUsers: number;
    topPercent: number;
    returnPercent: number;
    period: string;
    mode: string;
  }> {
    try {
      const countResult = await this.sql`
        SELECT COUNT(*) as total FROM trader.users
      `;
      const totalUsers = Math.max(1, parseInt((countResult as any)[0]?.total || '1', 10));
      // Placeholder ranking — real implementation needs aggregated trade P&L
      const rank = Math.ceil(Math.random() * totalUsers);
      const topPercent = (rank / totalUsers) * 100;

      return {
        rank,
        totalUsers,
        topPercent,
        returnPercent: Math.random() * 30 - 5,
        period,
        mode,
      };
    } catch {
      return { rank: 1, totalUsers: 1, topPercent: 100, returnPercent: 0, period, mode };
    }
  }

  // ─── Achievements ────────────────────────────────────────

  async getUserAchievements(userId: string): Promise<any[]> {
    try {
      // Try to get user-specific progress joined with achievement definitions
      const result = await this.sql`
        SELECT
          a.id, a.name, a.description, a.icon, a.category, a.progress_target,
          ua.earned_at, ua.progress_current
        FROM trader.achievements a
        LEFT JOIN trader.user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ${userId}
        ORDER BY a.id
      `;

      if (Array.isArray(result) && result.length > 0) {
        return result.map((row: any) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          icon: row.icon,
          category: row.category,
          earnedAt: row.earned_at || null,
          progressTarget: row.progress_target || 0,
          progressCurrent: row.progress_current || 0,
          progress: row.progress_target > 0
            ? Math.round((row.progress_current || 0) / row.progress_target * 100)
            : 0,
        }));
      }

      // Return default achievements if table is empty
      return this.getDefaultAchievements();
    } catch {
      // Tables might not exist yet — return defaults
      return this.getDefaultAchievements();
    }
  }

  private getDefaultAchievements(): any[] {
    return [
      { id: 1, name: 'First Trade', description: 'Execute your first trade', icon: 'handshake', category: 'Trading', earnedAt: null, progressTarget: 1, progressCurrent: 0, progress: 0 },
      { id: 2, name: 'Portfolio Builder', description: 'Hold 5 positions simultaneously', icon: 'account_balance', category: 'Trading', earnedAt: null, progressTarget: 5, progressCurrent: 0, progress: 0 },
      { id: 3, name: 'Winning Streak', description: 'Make 3 profitable trades in a row', icon: 'local_fire_department', category: 'Streak', earnedAt: null, progressTarget: 3, progressCurrent: 0, progress: 0 },
      { id: 4, name: 'Week Warrior', description: 'Trade on 5 consecutive days', icon: 'calendar_month', category: 'Streak', earnedAt: null, progressTarget: 5, progressCurrent: 0, progress: 0 },
      { id: 5, name: 'Risk Manager', description: 'Set up all risk parameters', icon: 'shield', category: 'Risk', earnedAt: null, progressTarget: 3, progressCurrent: 0, progress: 0 },
      { id: 6, name: 'Safe Hands', description: 'Never trigger a circuit breaker', icon: 'verified_user', category: 'Risk', earnedAt: null, progressTarget: 0, progressCurrent: 0, progress: 0 },
      { id: 7, name: 'Leaderboard Climber', description: 'Reach top 50% on the leaderboard', icon: 'trending_up', category: 'Social', earnedAt: null, progressTarget: 0, progressCurrent: 0, progress: 0 },
      { id: 8, name: 'Paper Graduate', description: 'Graduate from paper to live trading', icon: 'school', category: 'Trading', earnedAt: null, progressTarget: 0, progressCurrent: 0, progress: 0 },
      { id: 9, name: 'Diversified', description: 'Hold positions in 3 different sectors', icon: 'pie_chart', category: 'Trading', earnedAt: null, progressTarget: 3, progressCurrent: 0, progress: 0 },
      { id: 10, name: 'Ten Bagger', description: 'Achieve 10% total return', icon: 'emoji_events', category: 'Trading', earnedAt: null, progressTarget: 0, progressCurrent: 0, progress: 0 },
    ];
  }

  // ─── Explicit Trade Placement ────────────────────────────

  async placeTrade(userId: string, ticker: string, side: 'buy' | 'sell', shares: number): Promise<{
    success: boolean;
    trade: any;
    message: string;
  }> {
    const agent = await this.getUserAgent(userId);
    const portfolio = agent.getAgentOutput();

    if (side === 'buy') {
      // Fetch current price
      const { MarketData } = await import('../data/market_data.js');
      const md = new MarketData();
      const candles = await md.fetchCandles(ticker, 5);
      const price = candles.prices[candles.prices.length - 1] || 0;
      if (price <= 0) throw new Error(`Could not get price for ${ticker}`);

      const cost = price * shares;
      if (cost > portfolio.performance.cash) {
        throw new Error(`Insufficient cash. Need $${cost.toFixed(2)} but only $${portfolio.performance.cash.toFixed(2)} available.`);
      }

      // Use the agent's portfolio.addPosition
      const success = (agent as any).portfolio
        ? (agent as any).portfolio.addPosition(ticker, price, shares, 0)
        : false;

      if (!success) throw new Error('Failed to execute buy order');

      return {
        success: true,
        trade: {
          ticker,
          type: 'BUY',
          price,
          shares,
          totalValue: price * shares,
          timestamp: new Date().toISOString(),
        },
        message: `Bought ${shares} shares of ${ticker} at $${price.toFixed(2)}`,
      };
    } else {
      // Sell
      const positions = agent.getPositions();
      const position = positions.find((p: any) => p.ticker === ticker);
      if (!position) throw new Error(`No position found for ${ticker}`);
      if (shares > position.shares) throw new Error(`Only ${position.shares} shares available to sell`);

      const { MarketData } = await import('../data/market_data.js');
      const md = new MarketData();
      const candles = await md.fetchCandles(ticker, 5);
      const price = candles.prices[candles.prices.length - 1] || position.currentPrice;

      // For full sell, use removePosition; for partial, we need to handle manually
      if (shares === position.shares) {
        const success = (agent as any).portfolio
          ? (agent as any).portfolio.removePosition(ticker, price)
          : false;
        if (!success) throw new Error('Failed to execute sell order');
      } else {
        // Partial sell — adjust position
        const portfolio = (agent as any).portfolio;
        if (!portfolio) throw new Error('Portfolio not accessible');
        const pos = portfolio.getPosition(ticker);
        if (pos) {
          pos.shares -= shares;
          portfolio['cash'] = (portfolio['cash'] || 0) + price * shares;
          portfolio['trades']?.recordTrade(ticker, 'SELL', price, shares, pos.entryScore);
        }
      }

      return {
        success: true,
        trade: {
          ticker,
          type: 'SELL',
          price,
          shares,
          totalValue: price * shares,
          timestamp: new Date().toISOString(),
        },
        message: `Sold ${shares} shares of ${ticker} at $${price.toFixed(2)}`,
      };
    }
  }
}
