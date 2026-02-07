/**
 * Dashboard Component
 * Displays portfolio, positions, trades, and scores
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import type { Portfolio, Position, Trade, Score, ChatMessage, ChatAction } from '../types'
import { usePortfolioMode } from '../context/PortfolioModeContext'
import PoliticianTrades from './PoliticianTrades'
import CollapsibleCard from './CollapsibleCard'
import MarketHot from './MarketHot'
import BiggestMovers from './BiggestMovers'
import TopMovers from './TopMovers'
import HeroBalanceCard from './HeroBalanceCard'
import TradePanel from './TradePanel'

export default function Dashboard() {
  const navigate = useNavigate()
  const { mode } = usePortfolioMode()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatExpanded, setChatExpanded] = useState(false)

  // Trade panel state
  const [tradeModal, setTradeModal] = useState<{
    ticker: string
    side: 'buy' | 'sell'
    currentPrice: number
    currentShares?: number
  } | null>(null)

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

  function openBuyPanel(ticker: string, currentPrice: number) {
    setTradeModal({ ticker, side: 'buy', currentPrice })
  }

  function openSellPanel(ticker: string, currentPrice: number, currentShares: number) {
    setTradeModal({ ticker, side: 'sell', currentPrice, currentShares })
  }

  async function handleTradeSubmit(order: { ticker: string; side: 'buy' | 'sell'; shares: number }) {
    try {
      setMessage(null)
      await apiService.placeTrade(order)
      await loadData()
      setMessage({
        type: 'success',
        text: `${order.side === 'buy' ? 'Buy' : 'Sell'} order for ${order.shares} shares of ${order.ticker} processed`
      })
    } catch (err) {
      throw err
    }
  }

  async function handleChatSend() {
    const question = chatInput.trim()
    if (!question || chatLoading) return

    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content: question }])
    setChatLoading(true)

    try {
      const response = await apiService.chat(question)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        actions: response.actions as ChatAction[] | undefined,
      }])
    } catch {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not process your question. The chat service may be unavailable.',
      }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleChatAction(action: ChatAction) {
    if (action.type === 'buy' && action.ticker) {
      const score = scores.find(s => s.ticker === action.ticker)
      openBuyPanel(action.ticker, score?.currentPrice || 0)
    } else if (action.type === 'sell' && action.ticker) {
      const pos = positions.find(p => p.ticker === action.ticker)
      openSellPanel(action.ticker, pos?.currentPrice || 0, pos?.shares || 0)
    } else if (action.type === 'analyze' && action.ticker) {
      navigate(`/stock/${action.ticker}`)
    } else if (action.type === 'rebalance') {
      handleRebalance()
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
          <button onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {/* Hero Balance Card */}
      {portfolio && (
        <>
          <HeroBalanceCard
            portfolioValue={portfolio.totalValue}
            dayChange={portfolio.unrealizedPnL}
            dayChangePercent={portfolio.unrealizedPnLPercent}
            mode={mode}
          />

          {/* Quick Stats Strip */}
          <div className="stats-row">
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
            <div className="stat-card">
              <label>Win Rate</label>
              <div className="value">68%</div>
            </div>
          </div>
        </>
      )}

      {/* Market Pulse - Hot Section */}
      <div className="section-header">
        <div className="section-header__title">Market Pulse</div>
        <div className="section-header__subtitle">What's hot in the market right now</div>
      </div>
      <MarketHot scores={scores} />

      {/* Biggest Movers */}
      <BiggestMovers scores={scores} />

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
                      <td>
                        <strong
                          className="ticker-link"
                          onClick={() => navigate(`/stock/${pos.ticker}`)}
                        >
                          {pos.ticker}
                        </strong>
                      </td>
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
                        <button className="btn-sell" onClick={() => openSellPanel(pos.ticker, pos.currentPrice, pos.shares)}>
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
                            <strong
                              className="ticker-link"
                              onClick={() => navigate(`/stock/${score.ticker}`)}
                            >
                              {score.ticker}
                            </strong>
                          </div>
                        </td>
                        <td>{score.currentPrice ? `$${score.currentPrice.toFixed(2)}` : '--'}</td>
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
                          <div className="action-buttons">
                            <button className="btn-buy" onClick={() => openBuyPanel(score.ticker, score.currentPrice || 0)}>
                              Buy
                            </button>
                            <button className="btn-analyze" onClick={() => navigate(`/stock/${score.ticker}`)}>
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
                      {' \u2192 '}
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

          <div className="card">
            <h2>
              <span className="material-symbols-outlined">trending_up</span>
              Top Movers
            </h2>
            <TopMovers scores={scores} />
          </div>

          <PoliticianTrades />
        </aside>
      </div>

      {/* Portfolio Assistant Chat Widget */}
      <div className={`portfolio-assistant ${chatExpanded ? 'expanded' : ''}`}>
        <div className="assistant-header" onClick={() => setChatExpanded(!chatExpanded)}>
          <div className="assistant-icon">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <div className="assistant-info">
            <div className="assistant-title">Portfolio Assistant</div>
            <div className="assistant-status">
              <span className="status-dot"></span>
              {chatLoading ? 'Thinking...' : 'Online'}
            </div>
          </div>
          <button className="icon-btn">
            <span className="material-symbols-outlined">
              {chatExpanded ? 'expand_more' : 'expand_less'}
            </span>
          </button>
        </div>
        {chatExpanded && (
          <>
            <div className="assistant-messages">
              {chatMessages.length === 0 && (
                <div className="assistant-message">
                  <div className="message-icon">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div className="message-content">
                    {scores.length > 0 && scores[0]
                      ? <>I've ranked <strong>{scores[0].ticker} #1</strong> based on current market analysis. </>
                      : null
                    }
                    I can help with your portfolio, technical analysis, analyst ratings, politician trades, and trading. Try asking:
                    <div className="message-suggestions">
                      {['What should I buy?', 'Analyze my risk', 'What are politicians trading?'].map(q => (
                        <button key={q} className="suggestion-chip" onClick={() => { setChatInput(q); }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`assistant-message ${msg.role === 'user' ? 'user-message' : ''}`}>
                  <div className="message-icon">
                    <span className="material-symbols-outlined">
                      {msg.role === 'user' ? 'person' : 'smart_toy'}
                    </span>
                  </div>
                  <div className="message-content">
                    {msg.content}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="message-actions">
                        {msg.actions.map((action, actionIdx) => (
                          <button
                            key={actionIdx}
                            className={`chat-action-btn chat-action-${action.type}`}
                            onClick={() => handleChatAction(action)}
                          >
                            <span className="material-symbols-outlined">
                              {action.type === 'buy' ? 'add_shopping_cart' :
                               action.type === 'sell' ? 'sell' :
                               action.type === 'analyze' ? 'analytics' :
                               'sync'}
                            </span>
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="message-sources">
                        <small>Sources: {msg.sources.slice(0, 3).join(', ')}</small>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="assistant-message">
                  <div className="message-icon">
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div className="message-content">Analyzing...</div>
                </div>
              )}
            </div>
            <div className="assistant-input">
              <input
                type="text"
                placeholder="Ask about holdings, market, strategy..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                disabled={chatLoading}
              />
              <button className="icon-btn" onClick={handleChatSend} disabled={chatLoading}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Trade Panel Modal */}
      {tradeModal && portfolio && (
        <TradePanel
          isOpen={true}
          onClose={() => setTradeModal(null)}
          ticker={tradeModal.ticker}
          side={tradeModal.side}
          currentPrice={tradeModal.currentPrice}
          availableCash={portfolio.cash}
          currentShares={tradeModal.currentShares}
          onSubmit={handleTradeSubmit}
        />
      )}
    </>
  )
}
