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

      <style>{`
        .politician-trades-card h3 {
          font-size: 1rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .politician-trades-card h3 .material-symbols-outlined {
          font-size: 1.25rem;
          color: var(--primary);
        }

        .politician-trades-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .politician-trade-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface-darker);
          padding: 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-dark);
        }

        .trade-politician {
          flex: 1;
        }

        .politician-name {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .politician-info {
          display: flex;
          gap: 0.5rem;
        }

        .party-badge {
          font-size: 0.75rem;
          padding: 0.125rem 0.375rem;
          border-radius: 0.25rem;
          font-weight: 600;
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        .trade-details {
          text-align: right;
        }

        .trade-type {
          font-size: 0.875rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .trade-type.buy {
          color: var(--emerald);
        }

        .trade-type.sell {
          color: var(--rose);
        }

        .trade-ticker {
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'Fira Code', monospace;
          margin-bottom: 0.25rem;
        }

        .trade-date {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .loading-small {
          padding: 2rem;
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
