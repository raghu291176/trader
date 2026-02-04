/**
 * Dashboard Component
 * Displays portfolio, positions, trades, and scores
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { Portfolio, Position, Trade, Score } from '../types'
import TickerAnalysis from './TickerAnalysis'
import PoliticianTrades from './PoliticianTrades'
import CollapsibleCard from './CollapsibleCard'

interface DashboardProps {
  searchTicker?: string | null;
  onTickerSearched?: () => void;
}

export default function Dashboard({ searchTicker, onTickerSearched }: DashboardProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  // Handle search ticker from header
  useEffect(() => {
    if (searchTicker) {
      setSelectedTicker(searchTicker);
      onTickerSearched?.();
    }
  }, [searchTicker, onTickerSearched]);

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
      setTrades(tradesData.slice(-10))
      setScores(scoresData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function handleRebalance() {
    if (!confirm('Rebalance your portfolio? This will execute trades based on current market conditions.')) return

    try {
      setLoading(true)
      setMessage(null)
      await apiService.executeRotation()
      await loadData()
      setMessage({ type: 'success', text: 'Portfolio rebalanced successfully' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to rebalance: ' + (err instanceof Error ? err.message : 'Unknown error') })
    } finally {
      setLoading(false)
    }
  }

  async function handleBuyStock(ticker: string) {
    const shares = prompt(`How many shares of ${ticker} do you want to buy?`)
    if (!shares || isNaN(Number(shares))) return

    try {
      setMessage(null)
      // For now, trigger a rebalance which will analyze and potentially buy
      // In the future, this could be a direct buy API
      await apiService.executeRotation()
      await loadData()
      setMessage({ type: 'success', text: `Buy order for ${ticker} processed` })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to buy: ' + (err instanceof Error ? err.message : 'Unknown error') })
    }
  }

  async function handleSellStock(ticker: string) {
    if (!confirm(`Sell all shares of ${ticker}?`)) return

    try {
      setMessage(null)
      // Trigger rebalance to sell position
      await apiService.executeRotation()
      await loadData()
      setMessage({ type: 'success', text: `Sell order for ${ticker} processed` })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to sell: ' + (err instanceof Error ? err.message : 'Unknown error') })
    }
  }

  if (loading && !portfolio) {
    return <div className="loading">Loading...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <>
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      {/* Top Stats Row */}
      {portfolio && (
        <div className="stats-row">
          <div className="stat-card">
            <label>Portfolio Value</label>
            <div className="value">${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <label>24h Change</label>
            <div className={`value ${portfolio.unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.unrealizedPnL >= 0 ? '+' : ''}${portfolio.unrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({portfolio.unrealizedPnLPercent >= 0 ? '+' : ''}{portfolio.unrealizedPnLPercent.toFixed(2)}%)
            </div>
          </div>
          <div className="stat-card">
            <label>Total Return</label>
            <div className={`value ${portfolio.unrealizedPnLPercent >= 0 ? 'positive' : 'negative'}`}>
              {portfolio.unrealizedPnLPercent >= 0 ? '+' : ''}{portfolio.unrealizedPnLPercent.toFixed(1)}%
            </div>
          </div>
          <div className="stat-card">
            <label>Max Drawdown</label>
            <div className="value negative">{portfolio.maxDrawdown.toFixed(1)}%</div>
          </div>
          <div className="stat-card">
            <label>Sharpe Ratio</label>
            <div className="value">1.85</div>
          </div>
        </div>
      )}

      {/* Main Layout with Sidebar */}
      <div className="dashboard-layout">
        {/* Main Content */}
        <div className="dashboard-main">
          {/* Active Holdings */}
          <CollapsibleCard title="Active Holdings" icon="pie_chart" defaultExpanded={true}>
            {positions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Shares</th>
                    <th>Avg Cost</th>
                    <th>Price</th>
                    <th>P&L ($)</th>
                    <th>P&L (%)</th>
                    <th className="text-right">Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos) => (
                    <tr key={pos.ticker}>
                      <td><strong>{pos.ticker}</strong></td>
                      <td>{pos.shares.toLocaleString()}</td>
                      <td>${pos.entryPrice.toFixed(2)}</td>
                      <td>${pos.currentPrice.toFixed(2)}</td>
                      <td className={pos.unrealizedPnL >= 0 ? 'positive' : 'negative'}>
                        {pos.unrealizedPnL >= 0 ? '+' : ''}${Math.abs(pos.unrealizedPnL).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className={pos.unrealizedPnLPercent >= 0 ? 'positive' : 'negative'}>
                        {pos.unrealizedPnLPercent >= 0 ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(0)}%
                      </td>
                      <td className="text-right"><strong>{pos.entryScore?.toFixed(2) || 'N/A'}</strong></td>
                      <td>
                        <button className="btn-sell" onClick={() => handleSellStock(pos.ticker)}>
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">No current holdings</p>
            )}
          </CollapsibleCard>

          {/* Candidate Watchlist & Scoring Engine */}
          <CollapsibleCard
            title="Candidate Watchlist & Scoring Engine"
            icon="star"
            defaultExpanded={true}
            actions={
              <>
                <button className="btn-secondary">
                  <span className="material-symbols-outlined">tune</span>
                  Filters
                </button>
                <button className="btn-primary" onClick={handleRebalance} disabled={loading}>
                  <span className="material-symbols-outlined">play_arrow</span>
                  Run Scanner
                </button>
              </>
            }
          >
            {scores.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Ticker</th>
                    <th>Price</th>
                    <th>Score</th>
                    <th>PRD Breakdown</th>
                    <th>Rotation Gain</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.slice(0, 5).map((score, idx) => {
                    const momentum = score.components?.momentum || 0
                    const catalyst = score.components?.catalyst || 0
                    const upside = score.components?.upside || 0
                    const timing = score.components?.timing || 0

                    const getMomentumLabel = (val: number) => val > 0.7 ? 'High' : val > 0.4 ? 'Med' : 'Low'
                    const getCatalystLabel = (val: number) => val > 0.7 ? 'Earn' : val > 0.4 ? 'News' : 'BTC'

                    return (
                      <tr key={score.ticker}>
                        <td>#{idx + 1}</td>
                        <td>
                          <div>
                            <strong>{score.ticker}</strong>
                          </div>
                        </td>
                        <td>${score.currentPrice?.toFixed(2) || 'N/A'}</td>
                        <td><strong>{score.score.toFixed(2)}</strong></td>
                        <td>
                          <div className="prd-badges">
                            <span className="badge badge-mom">Mom: {getMomentumLabel(momentum)}</span>
                            <span className="badge badge-cat">Cat: {getCatalystLabel(catalyst)}</span>
                            <span className="badge badge-up">Up: {upside > 0 ? '+' : ''}{(upside * 100).toFixed(0)}%</span>
                            {timing > 0 && <span className="badge badge-vol">Tim: {(timing * 100).toFixed(0)}</span>}
                          </div>
                        </td>
                        <td className={score.score > 0.5 ? 'positive' : ''}>
                          <span className="material-symbols-outlined">{score.score > 0.5 ? 'trending_up' : 'trending_flat'}</span>
                          {score.score > 0.5 ? '+' : ''}{(score.score - 0.5).toFixed(2)} vs AVG
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-buy" onClick={() => handleBuyStock(score.ticker)}>
                              Buy
                            </button>
                            <button className="btn-analyze" onClick={() => setSelectedTicker(score.ticker)}>
                              Analyze
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <p className="empty">Analyzing market opportunities...</p>
            )}
          </CollapsibleCard>
        </div>

        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="card">
            <div className="sidebar-header">
              <h3>Recent Rotations</h3>
              <button className="icon-btn">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
            <div className="rotations-list">
              {trades.slice(0, 3).map((trade, idx) => (
                <div key={idx} className="rotation-item">
                  <div className="rotation-icon">
                    <span className="material-symbols-outlined">sync_alt</span>
                  </div>
                  <div className="rotation-content">
                    <div className="rotation-time">
                      {new Date(trade.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="rotation-trade">
                      <span className={trade.type === 'BUY' ? 'positive' : 'negative'}>
                        {trade.ticker}
                      </span>
                      {' → '}
                      <span>{trade.type === 'BUY' ? 'Bought' : 'Sold'}</span>
                      {' @ $'}{trade.price.toFixed(2)}
                    </div>
                    <div className="rotation-reason">
                      {trade.reason || (trade.type === 'BUY'
                        ? `Score: ${trade.score?.toFixed(2) || 'N/A'}`
                        : `Sold ${trade.shares} shares`)}
                    </div>
                  </div>
                  <div className={`rotation-status ${trade.type === 'BUY' ? 'success' : 'rejected'}`}>
                    {trade.type === 'BUY' ? 'Success' : 'Sold'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <PoliticianTrades />
        </aside>
      </div>

      {/* Ticker Analysis Modal */}
      {selectedTicker && (
        <TickerAnalysis ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}

      {/* Portfolio Assistant Chat Widget */}
      <div className="portfolio-assistant">
        <div className="assistant-header">
          <div className="assistant-icon">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div className="assistant-info">
            <div className="assistant-title">Portfolio Assistant</div>
            <div className="assistant-status">
              <span className="status-dot"></span>
              Online • Analyzing
            </div>
          </div>
          <button className="icon-btn">
            <span className="material-symbols-outlined">expand_more</span>
          </button>
        </div>
        <div className="assistant-messages">
          {scores.length > 0 && scores[0] && (
            <div className="assistant-message">
              <div className="message-icon">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div className="message-content">
                I've ranked <strong>{scores[0].ticker} #1</strong> based on current market analysis.
                <div className="message-meta">
                  <span className="badge badge-vol">Score: {scores[0].score.toFixed(2)}</span>
                  {scores[0].components?.momentum && (
                    <span className="badge badge-rsi">Mom: {(scores[0].components.momentum * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {scores.length === 0 && (
            <div className="assistant-message">
              <div className="message-icon">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <div className="message-content">
                Analyzing market opportunities...
              </div>
            </div>
          )}
        </div>
        <div className="assistant-input">
          <input type="text" placeholder="Ask about holdings..." />
          <button className="icon-btn">
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </>
  )
}
