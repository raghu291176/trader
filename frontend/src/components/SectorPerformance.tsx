/**
 * Sector Performance Widget
 * Shows sector performance today
 */

import { useNavigate } from 'react-router-dom'

interface Sector {
  name: string
  ticker: string
  change: number
  icon: string
}

export default function SectorPerformance() {
  const navigate = useNavigate()

  const sectors: Sector[] = [
    { name: 'Technology', ticker: 'XLK', change: 1.85, icon: 'computer' },
    { name: 'Communication', ticker: 'XLC', change: 1.42, icon: 'cell_tower' },
    { name: 'Consumer Disc.', ticker: 'XLY', change: 0.95, icon: 'shopping_cart' },
    { name: 'Healthcare', ticker: 'XLV', change: 0.67, icon: 'medical_services' },
    { name: 'Financials', ticker: 'XLF', change: 0.52, icon: 'account_balance' },
    { name: 'Industrials', ticker: 'XLI', change: -0.15, icon: 'factory' },
    { name: 'Energy', ticker: 'XLE', change: -0.68, icon: 'bolt' },
    { name: 'Utilities', ticker: 'XLU', change: -1.22, icon: 'flash_on' },
  ]

  // Sort by performance
  const sortedSectors = [...sectors].sort((a, b) => b.change - a.change)

  return (
    <div className="sector-performance-widget">
      <div className="sectors-grid">
        {sortedSectors.map((sector) => (
          <div
            key={sector.ticker}
            className="sector-card"
            onClick={() => navigate(`/stock/${sector.ticker}`)}
          >
            <div className="sector-icon">
              <span className="material-symbols-outlined">{sector.icon}</span>
            </div>
            <div className="sector-info">
              <div className="sector-name">{sector.name}</div>
              <div className={`sector-change ${sector.change >= 0 ? 'positive' : 'negative'}`}>
                {sector.change >= 0 ? '+' : ''}{sector.change.toFixed(2)}%
              </div>
            </div>
            <div className="sector-bar">
              <div
                className={`sector-bar-fill ${sector.change >= 0 ? 'positive-bar' : 'negative-bar'}`}
                style={{ width: `${Math.min(Math.abs(sector.change) * 30, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .sector-performance-widget {
          width: 100%;
        }

        .sectors-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.625rem;
        }

        .sector-card {
          padding: 0.75rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sector-card:hover {
          border-color: var(--primary);
          transform: scale(1.02);
        }

        .sector-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          background: rgba(0, 200, 5, 0.08);
          border-radius: 0.375rem;
          margin-bottom: 0.5rem;
        }

        .sector-icon .material-symbols-outlined {
          font-size: 1.125rem;
          color: var(--primary);
        }

        .sector-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
        }

        .sector-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sector-change {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .sector-bar {
          height: 4px;
          background: var(--border-dark);
          border-radius: 2px;
          overflow: hidden;
        }

        .sector-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .positive-bar {
          background: var(--emerald);
        }

        .negative-bar {
          background: var(--rose);
        }

        @media (max-width: 768px) {
          .sectors-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
