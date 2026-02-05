/**
 * Politician Trades Widget
 * Shows recent stock trades by politicians
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'

export default function PoliticianTrades() {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTrades()
  }, [])

  async function loadTrades() {
    try {
      setLoading(true)
      // Get Nancy Pelosi's trades as default
      const data = await apiService.getPoliticianTrades('Nancy Pelosi', 10)
      setTrades(data.trades || [])
    } catch (err) {
      console.error('Failed to load politician trades:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="card"><div className="loading-small">Loading trades...</div></div>
  }

  return (
    <div className="card politician-trades-card">
      <div className="sidebar-header">
        <h3>
          <span className="material-symbols-outlined">account_balance</span>
          Politician Trades
        </h3>
      </div>

      {trades.length > 0 ? (
        <div className="politician-trades-list">
          {trades.slice(0, 5).map((trade, idx) => (
            <div key={idx} className="politician-trade-item">
              <div className="trade-politician">
                <div className="politician-name">{trade.politician_name || 'Unknown'}</div>
                <div className="politician-info">
                  <span className="party-badge">{trade.party || 'N/A'}</span>
                </div>
              </div>
              <div className="trade-details">
                <div className={`trade-type ${trade.transaction_type?.toLowerCase() === 'purchase' ? 'buy' : 'sell'}`}>
                  {trade.transaction_type?.toUpperCase() || 'TRADE'}
                </div>
                <div className="trade-ticker">{trade.ticker}</div>
                <div className="trade-date">{new Date(trade.transaction_date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-small">No recent trades</div>
      )}

    </div>
  )
}
