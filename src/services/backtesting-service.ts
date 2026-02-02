/**
 * Backtesting Service
 * Simulates portfolio rotation strategy over historical data
 */

import { MarketData } from '../data/market_data.js';
import { Scorer, Score } from '../agent/scorer.js';
import { CatalystSignals } from '../agent/scanner.js';

export interface BacktestConfig {
  startDate: Date;
  endDate: Date;
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
  entryDate: Date;
  exitPrice?: number;
  exitDate?: Date;
  exitReason?: 'rebalance' | 'stop_loss' | 'take_profit' | 'end_of_period';
  pnl?: number;
  pnlPercent?: number;
}

export interface BacktestSnapshot {
  date: Date;
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
  benchmarkReturns?: { date: Date; value: number; return: number }[];
}

export class BacktestingService {
  private marketData: MarketData;
  private scorer: Scorer;

  constructor() {
    this.marketData = new MarketData();
    this.scorer = new Scorer();
  }

  /**
   * Run backtest simulation
   */
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    console.log(`Starting backtest: ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);

    const snapshots: BacktestSnapshot[] = [];
    const closedPositions: BacktestPosition[] = [];
    let cash = config.initialCapital;
    let activePositions: BacktestPosition[] = [];

    // Generate rebalancing dates
    const rebalanceDates = this.generateRebalanceDates(
      config.startDate,
      config.endDate,
      config.rebalanceFrequency
    );

    let previousPortfolioValue = config.initialCapital;

    for (const date of rebalanceDates) {
      try {
        // Get current prices for active positions
        const positionValues = await Promise.all(
          activePositions.map(async (pos) => {
            const candles = await this.marketData.fetchCandles(pos.ticker, 1);
            const price = candles.prices[candles.prices.length - 1];
            return {
              position: pos,
              currentPrice: price,
              value: pos.shares * price,
            };
          })
        );

        // Check stop loss and take profit
        if (config.stopLossPercent || config.takeProfitPercent) {
          for (const { position, currentPrice } of positionValues) {
            const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

            let shouldExit = false;
            let exitReason: BacktestPosition['exitReason'] = 'rebalance';

            if (config.stopLossPercent && pnlPercent <= -config.stopLossPercent) {
              shouldExit = true;
              exitReason = 'stop_loss';
            } else if (config.takeProfitPercent && pnlPercent >= config.takeProfitPercent) {
              shouldExit = true;
              exitReason = 'take_profit';
            }

            if (shouldExit) {
              const exitValue = position.shares * currentPrice;
              cash += exitValue;

              position.exitPrice = currentPrice;
              position.exitDate = date;
              position.exitReason = exitReason;
              position.pnl = exitValue - (position.shares * position.entryPrice);
              position.pnlPercent = pnlPercent;

              closedPositions.push(position);
              activePositions = activePositions.filter(p => p.ticker !== position.ticker);
            }
          }
        }

        // Get scores for all watchlist tickers
        const scores = await this.getScoresForDate(config.watchlist, date);

        // Sort by score descending
        const sortedScores = Array.from(scores.entries())
          .sort((a, b) => b[1].expectedReturn - a[1].expectedReturn);

        // Determine positions to enter/exit
        const topTickers = sortedScores
          .slice(0, config.maxPositions)
          .map(([ticker]) => ticker);

        // Exit positions not in top N
        for (const pos of activePositions) {
          if (!topTickers.includes(pos.ticker)) {
            const candles = await this.marketData.fetchCandles(pos.ticker, 1);
            const currentPrice = candles.prices[candles.prices.length - 1];
            const exitValue = pos.shares * currentPrice;
            cash += exitValue;

            pos.exitPrice = currentPrice;
            pos.exitDate = date;
            pos.exitReason = 'rebalance';
            pos.pnl = exitValue - (pos.shares * pos.entryPrice);
            pos.pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

            closedPositions.push(pos);
          }
        }

        activePositions = activePositions.filter(pos => topTickers.includes(pos.ticker));

        // Enter new positions
        for (const ticker of topTickers) {
          if (!activePositions.find(p => p.ticker === ticker)) {
            const candles = await this.marketData.fetchCandles(ticker, 1);
            const price = candles.prices[candles.prices.length - 1];
            const positionSize = (cash * config.positionSizePercent / 100) / price;

            if (positionSize > 0) {
              const shares = Math.floor(positionSize);
              const cost = shares * price;

              if (cost <= cash) {
                cash -= cost;
                activePositions.push({
                  ticker,
                  shares,
                  entryPrice: price,
                  entryDate: date,
                });
              }
            }
          }
        }

        // Calculate portfolio value
        const positionsValue = activePositions.reduce((sum, pos) => {
          const valueItem = positionValues.find(v => v.position.ticker === pos.ticker);
          return sum + (valueItem?.value || 0);
        }, 0);

        const portfolioValue = cash + positionsValue;
        const dailyReturn = ((portfolioValue - previousPortfolioValue) / previousPortfolioValue) * 100;
        const cumulativeReturn = ((portfolioValue - config.initialCapital) / config.initialCapital) * 100;

        snapshots.push({
          date,
          portfolioValue,
          cash,
          positions: JSON.parse(JSON.stringify(activePositions)),
          dailyReturn,
          cumulativeReturn,
        });

        previousPortfolioValue = portfolioValue;

      } catch (error) {
        console.error(`Error processing date ${date.toISOString()}:`, error);
      }
    }

    // Close remaining positions at end date
    for (const pos of activePositions) {
      const candles = await this.marketData.fetchCandles(pos.ticker, 1);
      const currentPrice = candles.prices[candles.prices.length - 1];
      const exitValue = pos.shares * currentPrice;

      pos.exitPrice = currentPrice;
      pos.exitDate = config.endDate;
      pos.exitReason = 'end_of_period';
      pos.pnl = exitValue - (pos.shares * pos.entryPrice);
      pos.pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

      closedPositions.push(pos);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(
      config,
      snapshots,
      closedPositions
    );

    // Get benchmark returns (SPY)
    const benchmarkReturns = await this.getBenchmarkReturns(
      config.startDate,
      config.endDate,
      config.initialCapital
    );

    return {
      config,
      snapshots,
      closedPositions,
      metrics,
      benchmarkReturns,
    };
  }

  /**
   * Generate rebalancing dates based on frequency
   */
  private generateRebalanceDates(
    startDate: Date,
    endDate: Date,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): Date[] {
    const dates: Date[] = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch (frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  }

  /**
   * Get scores for watchlist at a specific date
   */
  private async getScoresForDate(
    watchlist: string[],
    date: Date
  ): Promise<Map<string, Score>> {
    const scores = new Map<string, Score>();

    for (const ticker of watchlist) {
      try {
        // Fetch historical data up to the date
        const candleData = await this.marketData.fetchCandles(ticker, 100);

        // For backtesting, we use simple catalyst signals
        const dummyCatalyst: CatalystSignals = {
          ticker,
          signals: [],
          aggregatedScore: 0,
        };

        // Calculate score using scorer
        const score = this.scorer.scoreTickerWithCandles(
          ticker,
          candleData,
          dummyCatalyst
        );

        scores.set(ticker, score);
      } catch (error) {
        console.error(`Error scoring ${ticker}:`, error);
      }
    }

    return scores;
  }

  /**
   * Calculate backtest performance metrics
   */
  private calculateMetrics(
    config: BacktestConfig,
    snapshots: BacktestSnapshot[],
    closedPositions: BacktestPosition[]
  ): BacktestMetrics {
    const finalValue = snapshots[snapshots.length - 1]?.portfolioValue || config.initialCapital;
    const totalReturn = finalValue - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;

    // Calculate CAGR
    const years = (config.endDate.getTime() - config.startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const cagr = (Math.pow(finalValue / config.initialCapital, 1 / years) - 1) * 100;

    // Calculate daily returns
    const returns = snapshots.map(s => s.dailyReturn);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    ) * Math.sqrt(252); // Annualized

    // Sharpe Ratio (assuming 0% risk-free rate)
    const annualizedReturn = avgReturn * 252;
    const sharpeRatio = volatility !== 0 ? annualizedReturn / volatility : 0;

    // Sortino Ratio (downside deviation)
    const downside = returns.filter(r => r < 0);
    const downsideDeviation = downside.length > 0
      ? Math.sqrt(downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length) * Math.sqrt(252)
      : 0;
    const sortinoRatio = downsideDeviation !== 0 ? annualizedReturn / downsideDeviation : 0;

    // Max Drawdown
    let peak = config.initialCapital;
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;

    for (const snapshot of snapshots) {
      if (snapshot.portfolioValue > peak) {
        peak = snapshot.portfolioValue;
      }
      const drawdown = peak - snapshot.portfolioValue;
      const drawdownPercent = (drawdown / peak) * 100;

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownPercent = drawdownPercent;
      }
    }

    // Trade statistics
    const winningTrades = closedPositions.filter(p => (p.pnl || 0) > 0);
    const losingTrades = closedPositions.filter(p => (p.pnl || 0) < 0);
    const winRate = closedPositions.length > 0
      ? (winningTrades.length / closedPositions.length) * 100
      : 0;

    const totalWins = winningTrades.reduce((sum, p) => sum + (p.pnl || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, p) => sum + (p.pnl || 0), 0));
    const profitFactor = totalLosses !== 0 ? totalWins / totalLosses : 0;

    const avgWin = winningTrades.length > 0
      ? totalWins / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? totalLosses / losingTrades.length
      : 0;

    // Calmar Ratio
    const calmarRatio = maxDrawdownPercent !== 0 ? cagr / maxDrawdownPercent : 0;

    return {
      totalReturn,
      totalReturnPercent,
      cagr,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      totalTrades: closedPositions.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      volatility,
      calmarRatio,
    };
  }

  /**
   * Get benchmark returns (SPY as proxy for S&P 500)
   */
  private async getBenchmarkReturns(
    startDate: Date,
    endDate: Date,
    initialCapital: number
  ): Promise<{ date: Date; value: number; return: number }[]> {
    try {
      const days = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      const candleData = await this.marketData.fetchCandles('SPY', days);

      const startPrice = candleData.prices[0];
      const returns = candleData.prices.map((price, i) => ({
        date: candleData.dates[i],
        value: (price / startPrice) * initialCapital,
        return: ((price - startPrice) / startPrice) * 100,
      }));

      return returns;
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
      return [];
    }
  }

  /**
   * Compare multiple backtest configurations
   */
  async compareStrategies(configs: BacktestConfig[]): Promise<BacktestResult[]> {
    const results = await Promise.all(
      configs.map(config => this.runBacktest(config))
    );

    return results;
  }
}
