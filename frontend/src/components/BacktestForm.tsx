/**
 * Backtest Configuration Form
 * Allows users to configure and run backtests
 */

import React, { useState } from 'react';
import { apiService } from '../services/api';
import type { BacktestResult } from '../types';

interface BacktestFormProps {
  onResults: (result: BacktestResult) => void;
}

export const BacktestForm: React.FC<BacktestFormProps> = ({ onResults }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState({
    startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 10000,
    rebalanceFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    watchlist: 'NVDA,AMD,SMCI,PLTR,COIN,MSTR,SNOW,NET,DDOG,CRWD',
    maxPositions: 5,
    positionSizePercent: 20,
    stopLossPercent: '',
    takeProfitPercent: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setError(null);

    try {
      const watchlist = config.watchlist.split(',').map(t => t.trim()).filter(Boolean);

      const backtestConfig = {
        startDate: config.startDate,
        endDate: config.endDate,
        initialCapital: config.initialCapital,
        rebalanceFrequency: config.rebalanceFrequency,
        watchlist,
        maxPositions: config.maxPositions,
        positionSizePercent: config.positionSizePercent,
        stopLossPercent: config.stopLossPercent ? parseFloat(config.stopLossPercent) : undefined,
        takeProfitPercent: config.takeProfitPercent ? parseFloat(config.takeProfitPercent) : undefined,
      };

      const result = await apiService.runBacktest(backtestConfig);
      onResults(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="backtest-form-container">
      <h2>Backtest Configuration</h2>

      <form onSubmit={handleSubmit} className="backtest-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="initialCapital">Initial Capital ($)</label>
            <input
              id="initialCapital"
              type="number"
              min="100"
              step="100"
              value={config.initialCapital}
              onChange={(e) => setConfig({ ...config, initialCapital: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="rebalanceFrequency">Rebalance Frequency</label>
            <select
              id="rebalanceFrequency"
              value={config.rebalanceFrequency}
              onChange={(e) => setConfig({ ...config, rebalanceFrequency: e.target.value as any })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="watchlist">Watchlist (comma-separated)</label>
          <input
            id="watchlist"
            type="text"
            value={config.watchlist}
            onChange={(e) => setConfig({ ...config, watchlist: e.target.value })}
            placeholder="NVDA, AMD, SMCI, PLTR..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="maxPositions">Max Positions</label>
            <input
              id="maxPositions"
              type="number"
              min="1"
              max="20"
              value={config.maxPositions}
              onChange={(e) => setConfig({ ...config, maxPositions: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="positionSizePercent">Position Size (%)</label>
            <input
              id="positionSizePercent"
              type="number"
              min="1"
              max="100"
              value={config.positionSizePercent}
              onChange={(e) => setConfig({ ...config, positionSizePercent: parseFloat(e.target.value) })}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="stopLossPercent">Stop Loss (%) - Optional</label>
            <input
              id="stopLossPercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={config.stopLossPercent}
              onChange={(e) => setConfig({ ...config, stopLossPercent: e.target.value })}
              placeholder="e.g., 10"
            />
          </div>

          <div className="form-group">
            <label htmlFor="takeProfitPercent">Take Profit (%) - Optional</label>
            <input
              id="takeProfitPercent"
              type="number"
              min="0"
              max="1000"
              step="0.1"
              value={config.takeProfitPercent}
              onChange={(e) => setConfig({ ...config, takeProfitPercent: e.target.value })}
              placeholder="e.g., 50"
            />
          </div>
        </div>

        {error && (
          <div className="backtest-error">
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={isRunning}
        >
          {isRunning ? 'Running Backtest...' : 'Run Backtest'}
        </button>
      </form>
    </div>
  );
};
