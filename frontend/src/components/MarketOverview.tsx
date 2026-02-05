/**
 * Market Overview Widget
 * Shows major indices performance
 */

import { useEffect, useState } from 'react'

interface IndexData {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
}

export default function MarketOverview() {
  const [indices, setIndices] = useState<IndexData[]>([
    { symbol: 'SPX', name: 'S&P 500', value: 5825.23, change: 45.67, changePercent: 0.79 },
    { symbol: 'DJI', name: 'Dow Jones', value: 43250.15, change: -125.43, changePercent: -0.29 },
    { symbol: 'IXIC', name: 'NASDAQ', value: 18456.92, change: 123.45, changePercent: 0.67 },
    { symbol: 'RUT', name: 'Russell 2000', value: 2088.45, change: 12.34, changePercent: 0.59 },
  ])

  return (
    <div className="market-overview-widget">
      <div className="widget-grid">
        {indices.map((index) => (
          <div key={index.symbol} className="index-card">
            <div className="index-symbol">{index.symbol}</div>
            <div className="index-name">{index.name}</div>
            <div className="index-value">{index.value.toLocaleString()}</div>
            <div className={`index-change ${index.change >= 0 ? 'positive' : 'negative'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
                {index.change >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .market-overview-widget {
          width: 100%;
        }

        .widget-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }

        .index-card {
          padding: 0.875rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.5rem;
          transition: all 0.15s ease;
        }

        .index-card:hover {
          border-color: var(--primary);
          box-shadow: 0 2px 4px rgba(0, 200, 5, 0.08);
        }

        .index-symbol {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .index-name {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 0.125rem;
        }

        .index-value {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-top: 0.375rem;
          letter-spacing: -0.01em;
        }

        .index-change {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 0.25rem;
        }

        @media (max-width: 1200px) {
          .widget-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .widget-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
