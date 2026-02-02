/**
 * Backtest Results Display
 * Visualizes backtest performance metrics and equity curve
 */

import React from 'react';
import type { BacktestResult } from '../types';

interface BacktestResultsProps {
  result: BacktestResult;
}

export const BacktestResults: React.FC<BacktestResultsProps> = ({ result }) => {
  const { metrics, snapshots, closedPositions, benchmarkReturns, config } = result;

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number, decimals: number = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  };

  // Get final snapshot
  const finalSnapshot = snapshots[snapshots.length - 1];

  return (
    <div className="backtest-results">
      <h2>Backtest Results</h2>

      {/* Overview Cards */}
      <div className="results-overview">
        <div className="result-card">
          <div className="result-label">Total Return</div>
          <div className={`result-value ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(metrics.totalReturn)}
          </div>
          <div className="result-sublabel">
            {formatPercent(metrics.totalReturnPercent)}
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">CAGR</div>
          <div className={`result-value ${metrics.cagr >= 0 ? 'positive' : 'negative'}`}>
            {formatPercent(metrics.cagr)}
          </div>
          <div className="result-sublabel">
            Annualized Return
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Sharpe Ratio</div>
          <div className={`result-value ${metrics.sharpeRatio >= 1 ? 'positive' : 'neutral'}`}>
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <div className="result-sublabel">
            Risk-Adjusted Return
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Max Drawdown</div>
          <div className="result-value negative">
            {formatPercent(metrics.maxDrawdownPercent)}
          </div>
          <div className="result-sublabel">
            {formatCurrency(metrics.maxDrawdown)}
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="metrics-grid">
        <div className="metrics-section">
          <h3>Performance Metrics</h3>
          <div className="metrics-list">
            <div className="metric-row">
              <span>Initial Capital:</span>
              <span>{formatCurrency(config.initialCapital)}</span>
            </div>
            <div className="metric-row">
              <span>Final Value:</span>
              <span>{formatCurrency(finalSnapshot?.portfolioValue || 0)}</span>
            </div>
            <div className="metric-row">
              <span>Volatility (Annualized):</span>
              <span>{formatPercent(metrics.volatility)}</span>
            </div>
            <div className="metric-row">
              <span>Sortino Ratio:</span>
              <span>{metrics.sortinoRatio.toFixed(2)}</span>
            </div>
            <div className="metric-row">
              <span>Calmar Ratio:</span>
              <span>{metrics.calmarRatio.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="metrics-section">
          <h3>Trade Statistics</h3>
          <div className="metrics-list">
            <div className="metric-row">
              <span>Total Trades:</span>
              <span>{metrics.totalTrades}</span>
            </div>
            <div className="metric-row">
              <span>Win Rate:</span>
              <span className="positive">{formatPercent(metrics.winRate)}</span>
            </div>
            <div className="metric-row">
              <span>Profit Factor:</span>
              <span>{metrics.profitFactor.toFixed(2)}</span>
            </div>
            <div className="metric-row">
              <span>Avg Win:</span>
              <span className="positive">{formatCurrency(metrics.avgWin)}</span>
            </div>
            <div className="metric-row">
              <span>Avg Loss:</span>
              <span className="negative">{formatCurrency(metrics.avgLoss)}</span>
            </div>
            <div className="metric-row">
              <span>Winning Trades:</span>
              <span className="positive">{metrics.winningTrades}</span>
            </div>
            <div className="metric-row">
              <span>Losing Trades:</span>
              <span className="negative">{metrics.losingTrades}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="equity-curve-section">
        <h3>Equity Curve</h3>
        <div className="chart-container">
          <svg width="100%" height="300" className="equity-chart">
            {/* Simple line chart */}
            {snapshots.length > 1 && (
              <>
                {/* Strategy line */}
                <polyline
                  points={snapshots
                    .map((snapshot, i) => {
                      const x = (i / (snapshots.length - 1)) * 100;
                      const y = 100 - ((snapshot.portfolioValue - config.initialCapital) /
                        (Math.max(...snapshots.map(s => s.portfolioValue)) - config.initialCapital)) * 80;
                      return `${x}%,${y}%`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="var(--emerald)"
                  strokeWidth="2"
                />

                {/* Benchmark line */}
                {benchmarkReturns && benchmarkReturns.length > 1 && (
                  <polyline
                    points={benchmarkReturns
                      .map((point, i) => {
                        const x = (i / (benchmarkReturns.length - 1)) * 100;
                        const y = 100 - ((point.value - config.initialCapital) /
                          (Math.max(...snapshots.map(s => s.portfolioValue)) - config.initialCapital)) * 80;
                        return `${x}%,${y}%`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="var(--slate-400)"
                    strokeWidth="1.5"
                    strokeDasharray="5,5"
                  />
                )}

                {/* Baseline */}
                <line
                  x1="0"
                  y1="50%"
                  x2="100%"
                  y2="50%"
                  stroke="var(--slate-600)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              </>
            )}
          </svg>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: 'var(--emerald)' }}></span>
              <span>Strategy</span>
            </div>
            {benchmarkReturns && benchmarkReturns.length > 0 && (
              <div className="legend-item">
                <span className="legend-color" style={{ backgroundColor: 'var(--slate-400)' }}></span>
                <span>Benchmark (SPY)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div className="trade-history-section">
        <h3>Recent Trades (Last 20)</h3>
        <div className="trades-table-container">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Entry Date</th>
                <th>Exit Date</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>Shares</th>
                <th>P&L</th>
                <th>P&L %</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {closedPositions.slice(-20).reverse().map((trade, i) => (
                <tr key={i}>
                  <td className="ticker-cell">{trade.ticker}</td>
                  <td>{new Date(trade.entryDate).toLocaleDateString()}</td>
                  <td>{trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : '-'}</td>
                  <td>{formatCurrency(trade.entryPrice)}</td>
                  <td>{trade.exitPrice ? formatCurrency(trade.exitPrice) : '-'}</td>
                  <td>{trade.shares}</td>
                  <td className={`${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                  </td>
                  <td className={`${(trade.pnlPercent || 0) >= 0 ? 'positive' : 'negative'}`}>
                    {trade.pnlPercent ? formatPercent(trade.pnlPercent) : '-'}
                  </td>
                  <td className="reason-cell">{trade.exitReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
