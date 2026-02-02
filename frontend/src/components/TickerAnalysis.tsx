/**
 * Ticker Analysis Modal
 * Shows comprehensive market data, analyst ratings, news, and risk metrics
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import PriceChart from './PriceChart'

interface TickerAnalysisProps {
  ticker: string
  onClose: () => void
}

export default function TickerAnalysis({ ticker, onClose }: TickerAnalysisProps) {
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
      const [analysisData, tradesData, indicatorsData] = await Promise.all([
        apiService.getTickerAnalysis(ticker),
        apiService.getPoliticianTrades(ticker).catch(() => []),
        apiService.getTechnicalIndicators(ticker).catch(() => null)
      ])
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
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading analysis for {ticker}...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="error">Error: {error}</div>
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
  const monthlyHigh = analysis?.monthlyHigh
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            <strong>{ticker}</strong> Analysis
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Price Chart */}
          <section className="analysis-section">
            <h3>
              <span className="material-symbols-outlined">show_chart</span>
              Price History
            </h3>
            <PriceChart ticker={ticker} />
          </section>

          {/* Technical Indicators */}
          {indicators && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">analytics</span>
                Technical Indicators
              </h3>
              <div className="indicators-grid">
                {/* RSI */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <label>RSI (14)</label>
                    <span className={`indicator-badge ${indicators.rsi.signal === 'overbought' ? 'badge-negative' : indicators.rsi.signal === 'oversold' ? 'badge-positive' : 'badge-neutral'}`}>
                      {indicators.rsi.signal.charAt(0).toUpperCase() + indicators.rsi.signal.slice(1)}
                    </span>
                  </div>
                  <div className="indicator-value">{indicators.rsi.value.toFixed(2)}</div>
                  <div className="indicator-bar">
                    <div className="indicator-fill" style={{ width: `${indicators.rsi.value}%`, background: indicators.rsi.value > 70 ? 'var(--rose)' : indicators.rsi.value < 30 ? 'var(--emerald)' : 'var(--primary)' }}></div>
                  </div>
                </div>

                {/* MACD */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <label>MACD</label>
                    <span className={`indicator-badge ${indicators.macd.trend === 'bullish' ? 'badge-positive' : indicators.macd.trend === 'bearish' ? 'badge-negative' : 'badge-neutral'}`}>
                      {indicators.macd.trend.charAt(0).toUpperCase() + indicators.macd.trend.slice(1)}
                    </span>
                  </div>
                  <div className="indicator-value">{indicators.macd.histogram.toFixed(3)}</div>
                  <div className="indicator-details">
                    <span>MACD: {indicators.macd.macd.toFixed(2)}</span>
                    <span>Signal: {indicators.macd.signal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bollinger Bands */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <label>Bollinger Bands</label>
                    <span className="indicator-badge badge-neutral">
                      %B: {(indicators.bollinger.percentB * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="indicator-value">${indicators.bollinger.middle.toFixed(2)}</div>
                  <div className="indicator-details">
                    <span>Upper: ${indicators.bollinger.upper.toFixed(2)}</span>
                    <span>Lower: ${indicators.bollinger.lower.toFixed(2)}</span>
                  </div>
                </div>

                {/* Stochastic */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <label>Stochastic (14,3)</label>
                    <span className={`indicator-badge ${indicators.stochastic.signal === 'overbought' ? 'badge-negative' : indicators.stochastic.signal === 'oversold' ? 'badge-positive' : 'badge-neutral'}`}>
                      {indicators.stochastic.signal.charAt(0).toUpperCase() + indicators.stochastic.signal.slice(1)}
                    </span>
                  </div>
                  <div className="indicator-value">{indicators.stochastic.k.toFixed(2)}</div>
                  <div className="indicator-details">
                    <span>%K: {indicators.stochastic.k.toFixed(1)}</span>
                    <span>%D: {indicators.stochastic.d.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Overall Trend */}
              <div className="trend-summary">
                <div className="trend-label">Overall Trend:</div>
                <div className={`trend-value ${indicators.trend === 'bullish' ? 'positive' : indicators.trend === 'bearish' ? 'negative' : ''}`}>
                  <span className="material-symbols-outlined">
                    {indicators.trend === 'bullish' ? 'trending_up' : indicators.trend === 'bearish' ? 'trending_down' : 'trending_flat'}
                  </span>
                  {indicators.trend.charAt(0).toUpperCase() + indicators.trend.slice(1)}
                </div>
                <div className="trend-strength">
                  <label>Strength: {indicators.strength.toFixed(0)}%</label>
                  <div className="strength-bar">
                    <div className="strength-fill" style={{ width: `${indicators.strength}%` }}></div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Price Statistics */}
          {(metrics || monthlyHigh) && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">trending_up</span>
                Price Statistics
              </h3>
              <div className="price-stats-grid">
                {monthlyHigh && (
                  <div className="stat-box">
                    <label>Monthly High (30D)</label>
                    <div className="value positive">${monthlyHigh.price.toFixed(2)}</div>
                    <div className="date">{new Date(monthlyHigh.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                )}
                {metrics && metrics['52WeekHigh'] && (
                  <div className="stat-box">
                    <label>52-Week High</label>
                    <div className="value positive">${metrics['52WeekHigh'].toFixed(2)}</div>
                    {metrics['52WeekHighDate'] && (
                      <div className="date">{new Date(metrics['52WeekHighDate']).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    )}
                  </div>
                )}
                {metrics && metrics['52WeekLow'] && (
                  <div className="stat-box">
                    <label>52-Week Low</label>
                    <div className="value negative">${metrics['52WeekLow'].toFixed(2)}</div>
                    {metrics['52WeekLowDate'] && (
                      <div className="date">{new Date(metrics['52WeekLowDate']).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    )}
                  </div>
                )}
                {metrics && metrics.marketCapitalization && (
                  <div className="stat-box">
                    <label>Market Cap</label>
                    <div className="value">${(metrics.marketCapitalization / 1000).toFixed(2)}B</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Price Catalysts */}
          {catalysts.length > 0 && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">bolt</span>
                Price Catalysts
              </h3>
              <div className="catalysts-list">
                {catalysts.map((catalyst, idx) => (
                  <div key={idx} className={`catalyst-item ${catalyst.impact}`}>
                    <div className="catalyst-icon">
                      <span className="material-symbols-outlined">
                        {catalyst.type === 'earnings' ? 'account_balance' :
                         catalyst.type === 'upgrade' ? 'trending_up' :
                         catalyst.type === 'downgrade' ? 'trending_down' :
                         'newspaper'}
                      </span>
                    </div>
                    <div className="catalyst-content">
                      <div className="catalyst-type">
                        <span className={`badge badge-${catalyst.impact}`}>
                          {catalyst.type === 'earnings' ? 'Earnings' :
                           catalyst.type === 'upgrade' ? 'Upgrade' :
                           catalyst.type === 'downgrade' ? 'Downgrade' :
                           'News'}
                        </span>
                      </div>
                      <div className="catalyst-description">{catalyst.description}</div>
                      <div className="catalyst-date">
                        {new Date(catalyst.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className={`catalyst-impact ${catalyst.impact}`}>
                      <span className="material-symbols-outlined">
                        {catalyst.impact === 'positive' ? 'arrow_upward' :
                         catalyst.impact === 'negative' ? 'arrow_downward' :
                         'remove'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Analyst Ratings */}
          <section className="analysis-section">
            <h3>
              <span className="material-symbols-outlined">insights</span>
              Analyst Ratings
            </h3>
            {latestRec ? (
              <div className="analyst-ratings">
                <div className="ratings-summary">
                  <div className="rating-bar">
                    <div className="rating-segment buy" style={{ width: `${((latestRec.strongBuy + latestRec.buy) / totalRecommendations) * 100}%` }}></div>
                    <div className="rating-segment hold" style={{ width: `${(latestRec.hold / totalRecommendations) * 100}%` }}></div>
                    <div className="rating-segment sell" style={{ width: `${((latestRec.sell + latestRec.strongSell) / totalRecommendations) * 100}%` }}></div>
                  </div>
                  <div className="rating-labels">
                    <div className="rating-item">
                      <span className="badge badge-up">Strong Buy: {latestRec.strongBuy}</span>
                    </div>
                    <div className="rating-item">
                      <span className="badge badge-vol">Buy: {latestRec.buy}</span>
                    </div>
                    <div className="rating-item">
                      <span className="badge badge-cat">Hold: {latestRec.hold}</span>
                    </div>
                    <div className="rating-item">
                      <span className="badge badge-rsi">Sell: {latestRec.sell}</span>
                    </div>
                    <div className="rating-item">
                      <span className="badge warning">Strong Sell: {latestRec.strongSell}</span>
                    </div>
                  </div>
                  <div className="consensus">
                    <strong>{bullishPercent.toFixed(0)}% Bullish</strong> ({totalRecommendations} analysts)
                  </div>
                </div>
              </div>
            ) : (
              <p className="empty-small">No analyst ratings available</p>
            )}
          </section>

          {/* Price Target */}
          {priceTarget && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">target</span>
                Price Target
              </h3>
              <div className="price-targets">
                <div className="price-item">
                  <label>Target High</label>
                  <div className="value positive">${priceTarget.targetHigh?.toFixed(2)}</div>
                </div>
                <div className="price-item">
                  <label>Target Mean</label>
                  <div className="value">${priceTarget.targetMean?.toFixed(2)}</div>
                </div>
                <div className="price-item">
                  <label>Target Low</label>
                  <div className="value negative">${priceTarget.targetLow?.toFixed(2)}</div>
                </div>
              </div>
            </section>
          )}

          {/* Earnings */}
          {latestEarnings && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">account_balance</span>
                Latest Earnings
              </h3>
              <div className="earnings-data">
                <div className="earnings-item">
                  <label>Period</label>
                  <div>{latestEarnings.period} Q{latestEarnings.quarter} {latestEarnings.year}</div>
                </div>
                <div className="earnings-item">
                  <label>Actual</label>
                  <div className={latestEarnings.actual > latestEarnings.estimate ? 'positive' : 'negative'}>
                    ${latestEarnings.actual?.toFixed(2)}
                  </div>
                </div>
                <div className="earnings-item">
                  <label>Estimate</label>
                  <div>${latestEarnings.estimate?.toFixed(2)}</div>
                </div>
                <div className="earnings-item">
                  <label>Surprise</label>
                  <div className={latestEarnings.surprise > 0 ? 'positive' : 'negative'}>
                    {latestEarnings.surprise > 0 ? '+' : ''}{latestEarnings.surprisePercent?.toFixed(1)}%
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* News & Sentiment */}
          <section className="analysis-section">
            <h3>
              <span className="material-symbols-outlined">newspaper</span>
              Recent News & Sentiment
            </h3>
            <div className="sentiment-indicator">
              <label>Market Sentiment:</label>
              <span className={`sentiment-badge ${sentimentColor}`}>
                {sentimentLabel} ({sentiment > 0 ? '+' : ''}{sentiment.toFixed(2)})
              </span>
            </div>
            {recentNews.length > 0 ? (
              <div className="news-list">
                {recentNews.map((item: any, idx: number) => (
                  <div key={idx} className="news-item">
                    <div className="news-source">{item.source}</div>
                    <div className="news-headline">{item.headline}</div>
                    <div className="news-date">
                      {new Date(item.datetime * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-small">No recent news available</p>
            )}
          </section>

          {/* Risk Metrics */}
          <section className="analysis-section">
            <h3>
              <span className="material-symbols-outlined">warning</span>
              Risk Assessment
            </h3>
            <div className="risk-metrics">
              <div className="risk-item">
                <label>Volatility Risk</label>
                <div className="risk-bar">
                  <div className="risk-fill medium" style={{ width: '60%' }}></div>
                </div>
                <span className="risk-label">Medium</span>
              </div>
              <div className="risk-item">
                <label>Analyst Consensus Risk</label>
                <div className="risk-bar">
                  <div className="risk-fill low" style={{ width: `${100 - bullishPercent}%` }}></div>
                </div>
                <span className="risk-label">{100 - bullishPercent > 50 ? 'High' : bullishPercent > 70 ? 'Low' : 'Medium'}</span>
              </div>
              <div className="risk-item">
                <label>Sentiment Risk</label>
                <div className="risk-bar">
                  <div className="risk-fill low" style={{ width: `${Math.abs(sentiment) * 50}%` }}></div>
                </div>
                <span className="risk-label">{Math.abs(sentiment) > 0.5 ? 'High' : 'Low'}</span>
              </div>
            </div>
          </section>

          {/* Politician Holdings */}
          {politicianTrades.length > 0 && (
            <section className="analysis-section">
              <h3>
                <span className="material-symbols-outlined">gavel</span>
                Congressional Trades
              </h3>
              <div className="politician-trades-list">
                {politicianTrades.slice(0, 5).map((trade: any, idx: number) => (
                  <div key={idx} className="politician-trade-item">
                    <div className="trade-politician">
                      <div className="politician-name">{trade.politician || trade.politicianName}</div>
                      <div className="politician-info">
                        <span className="party-badge">{trade.party}</span>
                        <span className="chamber-badge">{trade.chamber}</span>
                      </div>
                    </div>
                    <div className="trade-details">
                      <div className={`trade-type ${trade.tradeType === 'Purchase' || trade.tradeType === 'purchase' ? 'buy' : 'sell'}`}>
                        {trade.tradeType || trade.trade_type}
                      </div>
                      <div className="trade-amount">${trade.amountRange?.min?.toLocaleString() || trade.amount_min?.toLocaleString()} - ${trade.amountRange?.max?.toLocaleString() || trade.amount_max?.toLocaleString()}</div>
                      <div className="trade-date">
                        {new Date(trade.transactionDate || trade.transaction_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
