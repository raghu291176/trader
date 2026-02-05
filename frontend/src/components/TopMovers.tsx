/**
 * Top Movers Widget
 * Shows top gainers and losers
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Mover {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: string
}

export default function TopMovers() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const gainers: Mover[] = [
    { ticker: 'NVDA', price: 725.50, change: 45.23, changePercent: 6.65, volume: '52.3M' },
    { ticker: 'META', price: 485.20, change: 28.15, changePercent: 6.16, volume: '18.2M' },
    { ticker: 'TSLA', price: 275.80, change: 15.42, changePercent: 5.92, volume: '95.4M' },
    { ticker: 'AMD', price: 165.30, change: 8.95, changePercent: 5.72, volume: '42.1M' },
  ]

  const losers: Mover[] = [
    { ticker: 'INTC', price: 42.15, change: -3.85, changePercent: -8.37, volume: '35.2M' },
    { ticker: 'DIS', price: 105.45, change: -6.55, changePercent: -5.85, volume: '12.8M' },
    { ticker: 'BA', price: 185.20, change: -9.80, changePercent: -5.03, volume: '8.4M' },
    { ticker: 'NFLX', price: 625.30, change: -28.70, changePercent: -4.39, volume: '5.2M' },
  ]

  const movers = tab === 'gainers' ? gainers : losers

  return (
    <div className="top-movers-widget">
      <div className="movers-tabs">
        <button
          className={`movers-tab ${tab === 'gainers' ? 'active' : ''}`}
          onClick={() => setTab('gainers')}
        >
          <span className="material-symbols-outlined">trending_up</span>
          Top Gainers
        </button>
        <button
          className={`movers-tab ${tab === 'losers' ? 'active' : ''}`}
          onClick={() => setTab('losers')}
        >
          <span className="material-symbols-outlined">trending_down</span>
          Top Losers
        </button>
      </div>

      <div className="movers-list">
        {movers.map((mover) => (
          <div
            key={mover.ticker}
            className="mover-item"
            onClick={() => navigate(`/stock/${mover.ticker}`)}
          >
            <div className="mover-left">
              <div className="mover-ticker">{mover.ticker}</div>
              <div className="mover-volume">{mover.volume} vol</div>
            </div>
            <div className="mover-right">
              <div className="mover-price">${mover.price.toFixed(2)}</div>
              <div className={`mover-change ${mover.change >= 0 ? 'positive' : 'negative'}`}>
                {mover.change >= 0 ? '+' : ''}{mover.changePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .top-movers-widget {
          width: 100%;
        }

        .movers-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.875rem;
        }

        .movers-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid var(--border-dark);
          border-radius: 0.375rem;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .movers-tab:hover {
          background: var(--surface-dark);
          border-color: var(--text-secondary);
        }

        .movers-tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .movers-tab .material-symbols-outlined {
          font-size: 1rem;
        }

        .movers-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .mover-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .mover-item:hover {
          border-color: var(--primary);
          transform: translateX(2px);
        }

        .mover-left {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .mover-ticker {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .mover-volume {
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }

        .mover-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.125rem;
        }

        .mover-price {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .mover-change {
          font-size: 0.75rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
