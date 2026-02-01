/**
 * Dashboard Component
 * Displays portfolio, positions, trades, and scores
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { Portfolio, Position, Trade, Score } from '../types'

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [portfolioData, positionsData, tradesData, scoresData] = await Promise.all([
        apiService.getPortfolio(),
        apiService.getPositions(),
        apiService.getTrades(),
        apiService.getScores(),
      ])

      setPortfolio(portfolioData)
      setPositions(positionsData)
      setTrades(tradesData.slice(-10)) // Last 10 trades
      setScores(scoresData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleExecuteRotation() {
    if (!confirm('Execute rotation? This will place real trades.')) return

    try {
      setLoading(true)
      await apiService.executeRotation()
      await loadData()
      alert('Rotation executed successfully!')
    } catch (err) {
      alert('Failed to execute rotation: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }

  if (loading && !portfolio) {
    return <div className="loading">Loading your portfolio...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="dashboard">
      {/* Portfolio Summary */}
      <section className="card">
        <h2>💼 Portfolio</h2>
        {portfolio && (
          <div className="stats">
            <div className="stat">
              <label>Total Value</label>
              <value>${portfolio.totalValue.toFixed(2)}</value>
            </div>
            <div className="stat">
              <label>Cash</label>
              <value>${portfolio.cash.toFixed(2)}</value>
            </div>
            <div className="stat">
              <label>Unrealized P&L</label>
              <value className={portfolio.unrealizedPnL >= 0 ? 'positive' : 'negative'}>
                ${portfolio.unrealizedPnL.toFixed(2)} ({portfolio.unrealizedPnLPercent.toFixed(2)}%)
              </value>
            </div>
            <div className="stat">
              <label>Max Drawdown</label>
              <value>{portfolio.maxDrawdown.toFixed(2)}%</value>
            </div>
            <div className="stat">
              <label>Positions</label>
              <value>{portfolio.positionCount}</value>
            </div>
          </div>
        )}
      </section>

      {/* Active Positions */}
      <section className="card">
        <h2>📊 Active Positions</h2>
        {positions.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Entry</th>
                <th>Current</th>
                <th>P&L</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr key={pos.ticker}>
                  <td><strong>{pos.ticker}</strong></td>
                  <td>{pos.shares}</td>
                  <td>${pos.entryPrice.toFixed(2)}</td>
                  <td>${pos.currentPrice.toFixed(2)}</td>
                  <td className={pos.unrealizedPnL >= 0 ? 'positive' : 'negative'}>
                    ${pos.unrealizedPnL.toFixed(2)} ({pos.unrealizedPnLPercent.toFixed(2)}%)
                  </td>
                  <td>${pos.value.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">No active positions</p>
        )}
      </section>

      {/* Top Scores */}
      <section className="card">
        <h2>⭐ Top Scores</h2>
        {scores.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Ticker</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 5).map((score, idx) => (
                <tr key={score.ticker}>
                  <td>{idx + 1}</td>
                  <td><strong>{score.ticker}</strong></td>
                  <td>{score.score.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">No scores available</p>
        )}
      </section>

      {/* Recent Trades */}
      <section className="card">
        <h2>📈 Recent Trades</h2>
        {trades.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ticker</th>
                <th>Shares</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx}>
                  <td>{new Date(trade.timestamp).toLocaleDateString()}</td>
                  <td className={trade.type === 'BUY' ? 'buy' : 'sell'}>{trade.type}</td>
                  <td><strong>{trade.ticker}</strong></td>
                  <td>{trade.shares}</td>
                  <td>${trade.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty">No trades yet</p>
        )}
      </section>

      {/* Actions */}
      <section className="actions">
        <button className="btn-primary" onClick={loadData} disabled={loading}>
          🔄 Refresh
        </button>
        <button className="btn-primary" onClick={handleExecuteRotation} disabled={loading}>
          🚀 Execute Rotation
        </button>
      </section>
    </div>
  )
}
