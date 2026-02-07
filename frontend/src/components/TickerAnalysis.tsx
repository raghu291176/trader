/**
 * Ticker Analysis — Semantic HTML5, mobile-first dashboard layout
 * Uses section/header/aside/figure/ul/time for proper semantics
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import PriceChart from './PriceChart'

interface TickerAnalysisProps {
  ticker: string
  onClose: () => void
  inline?: boolean
}

export default function TickerAnalysis({ ticker, onClose, inline = false }: TickerAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [politicianTrades, setPoliticianTrades] = useState<any[]>([])
  const [indicators, setIndicators] = useState<any>(null)

  useEffect(() => {
    loadAnalysis()
  }, [ticker])

  async function loadAnalysis() {
    try {
      setLoading(true)
      setError(null)
      const [snapshotData, tradesData, indicatorsData] = await Promise.all([
        apiService.getStockSnapshot(ticker),
        apiService.getPoliticianTradesForTicker(ticker).catch(() => []),
        apiService.getTechnicalIndicators(ticker).catch(() => null)
      ])

      const analysisData = {
        recommendations: snapshotData.recommendations ? [snapshotData.recommendations] : [],
        priceTarget: snapshotData.priceTarget,
        news: snapshotData.news || [],
        earnings: snapshotData.earnings || [],
        sentiment: snapshotData.sentiment,
        metrics: snapshotData.metrics,
        catalysts: snapshotData.catalysts || [],
        currentPrice: snapshotData.currentPrice,
        priceChange: snapshotData.priceChange,
        priceChangePercent: snapshotData.priceChangePercent,
      }

      setAnalysis(analysisData)
      setPoliticianTrades(tradesData)
      setIndicators(indicatorsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    if (inline) {
      return <div className="sd-loading" role="status" aria-live="polite">Loading analysis for {ticker}...</div>
    }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading" role="status">Loading analysis for {ticker}...</div>
        </div>
      </div>
    )
  }

  if (error) {
    if (inline) {
      return (
        <div role="alert">
          <div className="error">Error: {error}</div>
          <button className="btn-primary" onClick={onClose}>Back to Dashboard</button>
        </div>
      )
    }
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="error" role="alert">Error: {error}</div>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    )
  }

  const latestRec = analysis?.recommendations?.[0]
  const priceTarget = analysis?.priceTarget
  const recentNews = analysis?.news?.slice(0, 5) || []
  const latestEarnings = analysis?.earnings?.[0]
  const metrics = analysis?.metrics
  const catalysts = analysis?.catalysts || []

  const totalRecommendations = latestRec
    ? latestRec.strongBuy + latestRec.buy + latestRec.hold + latestRec.sell + latestRec.strongSell
    : 0

  const bullishPercent = latestRec
    ? ((latestRec.strongBuy + latestRec.buy) / totalRecommendations) * 100
    : 0

  const sentiment = analysis?.sentiment || 0
  const sentimentLabel = sentiment > 0.3 ? 'Positive' : sentiment < -0.3 ? 'Negative' : 'Neutral'
  const sentimentColor = sentiment > 0.3 ? 'positive' : sentiment < -0.3 ? 'negative' : ''

  const currentPrice = indicators?.currentPrice || analysis?.currentPrice || metrics?.currentPrice
  const priceChange = indicators?.priceChange || analysis?.priceChange
  const priceChangePercent = indicators?.priceChangePercent || analysis?.priceChangePercent

  const overallRating: string = latestRec ?
    (latestRec.strongBuy > 3 || bullishPercent > 70) ? 'Strong Buy' :
    (latestRec.buy > latestRec.hold) ? 'Buy' :
    (latestRec.hold > (latestRec.buy + latestRec.sell)) ? 'Hold' :
    (latestRec.sell > latestRec.buy) ? 'Sell' : 'Hold'
    : 'N/A'

  const ratingClass =
    overallRating === 'Strong Buy' || overallRating === 'Buy' ? 'positive' :
    overallRating === 'Sell' || overallRating === 'Strong Sell' ? 'negative' : ''

  const analysisContent = (
    <>
      {/* Modal header (non-inline only) */}
      {!inline && (
        <div className="modal-header">
          <h2><strong>{ticker}</strong> Analysis</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close analysis">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* ── TOP BAR: Ticker + Price + Rating + Target ── */}
      <header className="sd-topbar">
        <div className="sd-topbar-ticker">
          <h1 className="sd-ticker-symbol">{ticker}</h1>
          <span className={`sd-topbar-rating ${ratingClass}`} role="status">{overallRating}</span>
        </div>
        <div className="sd-topbar-price">
          <span className="sd-price-value">
            {currentPrice ? `$${currentPrice.toFixed(2)}` : '—'}
          </span>
          {priceChange !== undefined && priceChangePercent !== undefined && (
            <span className={`sd-price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {priceChange >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {priceChange >= 0 ? '+' : ''}${Math.abs(priceChange).toFixed(2)}
              ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          )}
        </div>
        <div className="sd-topbar-stats">
          {priceTarget && (
            <div className="sd-topbar-stat">
              <label>Target</label>
              <span>${priceTarget.targetMean?.toFixed(2)}</span>
            </div>
          )}
          {metrics?.marketCapitalization && (
            <div className="sd-topbar-stat">
              <label>Mkt Cap</label>
              <span>${(metrics.marketCapitalization / 1000).toFixed(1)}B</span>
            </div>
          )}
          {metrics?.['52WeekHigh'] && (
            <div className="sd-topbar-stat">
              <label>52W H/L</label>
              <span>${metrics['52WeekHigh'].toFixed(0)} / ${metrics['52WeekLow']?.toFixed(0)}</span>
            </div>
          )}
          <div className="sd-topbar-stat">
            <label>Sentiment</label>
            <span className={sentimentColor}>{sentimentLabel}</span>
          </div>
        </div>
      </header>

      {/* ── MAIN GRID: Chart left + Cards right ── */}
      <div className="sd-main-grid">
        {/* Left column: Chart + Indicators */}
        <div className="sd-col-chart">
          <figure className="sd-panel" aria-label={`${ticker} price chart`}>
            <PriceChart ticker={ticker} />
          </figure>

          {/* Technical Indicators */}
          {indicators && (
            <section className="sd-panel" aria-label="Technical indicators">
              <header className="sd-panel-header">
                <span className="material-symbols-outlined">analytics</span>
                Technical Indicators
                <span className={`sd-trend-badge ${indicators.trend === 'bullish' ? 'positive' : indicators.trend === 'bearish' ? 'negative' : ''}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {indicators.trend === 'bullish' ? 'trending_up' : indicators.trend === 'bearish' ? 'trending_down' : 'trending_flat'}
                  </span>
                  {indicators.trend.charAt(0).toUpperCase() + indicators.trend.slice(1)} ({indicators.strength.toFixed(0)}%)
                </span>
              </header>
              <div className="sd-indicators-row">
                <div className="sd-ind-chip">
                  <label>RSI</label>
                  <span className={indicators.rsi.signal === 'overbought' ? 'negative' : indicators.rsi.signal === 'oversold' ? 'positive' : ''}>{indicators.rsi.value.toFixed(1)}</span>
                  <small>{indicators.rsi.signal}</small>
                </div>
                <div className="sd-ind-chip">
                  <label>MACD</label>
                  <span className={indicators.macd.trend === 'bullish' ? 'positive' : indicators.macd.trend === 'bearish' ? 'negative' : ''}>{indicators.macd.histogram.toFixed(3)}</span>
                  <small>{indicators.macd.trend}</small>
                </div>
                <div className="sd-ind-chip">
                  <label>Bollinger %B</label>
                  <span>{(indicators.bollinger.percentB * 100).toFixed(0)}%</span>
                  <small>${indicators.bollinger.middle.toFixed(0)}</small>
                </div>
                <div className="sd-ind-chip">
                  <label>Stochastic</label>
                  <span className={indicators.stochastic.signal === 'overbought' ? 'negative' : indicators.stochastic.signal === 'oversold' ? 'positive' : ''}>{indicators.stochastic.k.toFixed(1)}</span>
                  <small>{indicators.stochastic.signal}</small>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right column: Compact info cards */}
        <aside className="sd-col-info" aria-label="Stock details">
          {/* Analyst Ratings */}
          <section className="sd-panel sd-panel-compact" aria-label="Analyst ratings">
            <header className="sd-panel-header">
              <span className="material-symbols-outlined">insights</span>
              Analyst Ratings
            </header>
            {latestRec ? (
              <>
                <div className="sd-rating-bar-row">
                  <div className="sd-rating-bar" role="meter" aria-label="Bullish percentage" aria-valuenow={bullishPercent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="sd-bar-buy" style={{ width: `${((latestRec.strongBuy + latestRec.buy) / totalRecommendations) * 100}%` }}></div>
                    <div className="sd-bar-hold" style={{ width: `${(latestRec.hold / totalRecommendations) * 100}%` }}></div>
                    <div className="sd-bar-sell" style={{ width: `${((latestRec.sell + latestRec.strongSell) / totalRecommendations) * 100}%` }}></div>
                  </div>
                  <span className="sd-rating-pct">{bullishPercent.toFixed(0)}% Bull</span>
                </div>
                <div className="sd-rating-chips">
                  <span className="sd-chip positive">SB {latestRec.strongBuy}</span>
                  <span className="sd-chip positive">B {latestRec.buy}</span>
                  <span className="sd-chip">H {latestRec.hold}</span>
                  <span className="sd-chip negative">S {latestRec.sell}</span>
                  <span className="sd-chip negative">SS {latestRec.strongSell}</span>
                </div>
              </>
            ) : (
              <p className="sd-empty">No ratings available</p>
            )}
          </section>

          {/* Price Targets */}
          {priceTarget && (
            <section className="sd-panel sd-panel-compact" aria-label="Price target">
              <header className="sd-panel-header">
                <span className="material-symbols-outlined">target</span>
                Price Target
              </header>
              <div className="sd-target-row">
                <div className="sd-target-item">
                  <label>Low</label>
                  <span className="negative">${priceTarget.targetLow?.toFixed(2)}</span>
                </div>
                <div className="sd-target-item sd-target-mean">
                  <label>Mean</label>
                  <span>${priceTarget.targetMean?.toFixed(2)}</span>
                </div>
                <div className="sd-target-item">
                  <label>High</label>
                  <span className="positive">${priceTarget.targetHigh?.toFixed(2)}</span>
                </div>
              </div>
              {currentPrice && priceTarget.targetMean && (
                <div className="sd-upside">
                  <span className={priceTarget.targetMean > currentPrice ? 'positive' : 'negative'}>
                    {((priceTarget.targetMean - currentPrice) / currentPrice * 100).toFixed(1)}% upside
                  </span>
                </div>
              )}
            </section>
          )}

          {/* Latest Earnings */}
          {latestEarnings && (
            <section className="sd-panel sd-panel-compact" aria-label="Latest earnings">
              <header className="sd-panel-header">
                <span className="material-symbols-outlined">account_balance</span>
                Earnings Q{latestEarnings.quarter} {latestEarnings.year}
              </header>
              <div className="sd-earnings-row">
                <div>
                  <label>Actual</label>
                  <span className={latestEarnings.actual > latestEarnings.estimate ? 'positive' : 'negative'}>
                    ${latestEarnings.actual?.toFixed(2)}
                  </span>
                </div>
                <div>
                  <label>Est</label>
                  <span>${latestEarnings.estimate?.toFixed(2)}</span>
                </div>
                <div>
                  <label>Surprise</label>
                  <span className={latestEarnings.surprise > 0 ? 'positive' : 'negative'}>
                    {latestEarnings.surprise > 0 ? '+' : ''}{latestEarnings.surprisePercent?.toFixed(1)}%
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Risk Assessment */}
          <section className="sd-panel sd-panel-compact" aria-label="Risk assessment">
            <header className="sd-panel-header">
              <span className="material-symbols-outlined">warning</span>
              Risk
            </header>
            <div className="sd-risk-rows">
              <div className="sd-risk-row">
                <label>Volatility</label>
                <div className="sd-risk-bar" role="meter" aria-valuenow={60} aria-valuemin={0} aria-valuemax={100}><div className="sd-risk-fill medium" style={{ width: '60%' }}></div></div>
                <span>Med</span>
              </div>
              <div className="sd-risk-row">
                <label>Consensus</label>
                <div className="sd-risk-bar" role="meter" aria-valuenow={100 - bullishPercent} aria-valuemin={0} aria-valuemax={100}><div className={`sd-risk-fill ${100 - bullishPercent > 50 ? 'high' : bullishPercent > 70 ? 'low' : 'medium'}`} style={{ width: `${100 - bullishPercent}%` }}></div></div>
                <span>{100 - bullishPercent > 50 ? 'High' : bullishPercent > 70 ? 'Low' : 'Med'}</span>
              </div>
              <div className="sd-risk-row">
                <label>Sentiment</label>
                <div className="sd-risk-bar" role="meter" aria-valuenow={Math.abs(sentiment) * 100} aria-valuemin={0} aria-valuemax={100}><div className={`sd-risk-fill ${Math.abs(sentiment) > 0.5 ? 'high' : 'low'}`} style={{ width: `${Math.max(Math.abs(sentiment) * 80, 10)}%` }}></div></div>
                <span>{Math.abs(sentiment) > 0.5 ? 'High' : 'Low'}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* ── BOTTOM GRID: News + Catalysts + Congressional ── */}
      <div className="sd-bottom-grid">
        {/* News */}
        <section className="sd-panel" aria-label="News and sentiment">
          <header className="sd-panel-header">
            <span className="material-symbols-outlined">newspaper</span>
            News &amp; Sentiment
            <span className={`sd-sentiment-chip ${sentimentColor}`}>
              {sentimentLabel} ({sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)})
            </span>
          </header>
          {recentNews.length > 0 ? (
            <ul className="sd-news-list">
              {recentNews.map((item: any, idx: number) => (
                <li key={idx} className="sd-news-item">
                  <div className="sd-news-meta">
                    <span className="sd-news-source">{item.source}</span>
                    <time className="sd-news-date" dateTime={new Date(item.datetime * 1000).toISOString()}>
                      {new Date(item.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </div>
                  <div className="sd-news-headline">{item.headline}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sd-empty">No recent news</p>
          )}
        </section>

        {/* Catalysts + Congressional in one column */}
        <div className="sd-bottom-right">
          {catalysts.length > 0 && (
            <section className="sd-panel" aria-label="Catalysts">
              <header className="sd-panel-header">
                <span className="material-symbols-outlined">bolt</span>
                Catalysts
              </header>
              <ul className="sd-catalysts-list">
                {catalysts.slice(0, 4).map((c: any, idx: number) => (
                  <li key={idx} className={`sd-catalyst ${c.impact}`}>
                    <span className={`sd-catalyst-badge ${c.impact}`}>
                      {c.type === 'earnings' ? 'Earn' : c.type === 'upgrade' ? 'Up' : c.type === 'downgrade' ? 'Down' : 'News'}
                    </span>
                    <span className="sd-catalyst-text">{c.description}</span>
                    <time className="sd-catalyst-date" dateTime={new Date(c.date).toISOString()}>
                      {new Date(c.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {politicianTrades.length > 0 && (
            <section className="sd-panel" aria-label="Congressional trades">
              <header className="sd-panel-header">
                <span className="material-symbols-outlined">gavel</span>
                Congressional Trades
              </header>
              <ul className="sd-congress-list">
                {politicianTrades.slice(0, 4).map((trade: any, idx: number) => (
                  <li key={idx} className="sd-congress-item">
                    <div className="sd-congress-left">
                      <span className="sd-congress-name">{trade.politician || trade.politicianName}</span>
                      <span className="sd-congress-meta">
                        {trade.party} · {trade.chamber}
                      </span>
                    </div>
                    <div className="sd-congress-right">
                      <span className={`sd-congress-type ${trade.tradeType === 'Purchase' || trade.tradeType === 'purchase' ? 'buy' : 'sell'}`}>
                        {trade.tradeType || trade.trade_type}
                      </span>
                      <time className="sd-congress-date" dateTime={new Date(trade.transactionDate || trade.transaction_date).toISOString()}>
                        {new Date(trade.transactionDate || trade.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {!inline && (
        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </footer>
      )}
    </>
  )

  if (inline) {
    return <div className="sd-page">{analysisContent}</div>
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        {analysisContent}
      </div>
    </div>
  )
}
