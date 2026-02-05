/**
 * Biggest Movers Widget (Kraken-inspired)
 * Shows assets with biggest price changes with larger charts
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Mover {
  ticker: string
  name: string
  price: number
  changePercent: number
  chartData: number[]
}

export default function BiggestMovers() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const gainers: Mover[] = [
    {
      ticker: 'NVDA',
      name: 'NVIDIA',
      price: 725.50,
      changePercent: 21.08,
      chartData: [600, 610, 625, 640, 655, 670, 685, 700, 715, 725],
    },
    {
      ticker: 'META',
      name: 'Meta Platforms',
      price: 485.20,
      changePercent: 19.34,
      chartData: [405, 410, 420, 435, 445, 455, 465, 472, 480, 485],
    },
    {
      ticker: 'AMD',
      name: 'AMD',
      price: 165.30,
      changePercent: 17.64,
      chartData: [140, 142, 145, 150, 153, 156, 158, 161, 163, 165],
    },
    {
      ticker: 'TSLA',
      name: 'Tesla',
      price: 275.80,
      changePercent: 17.61,
      chartData: [234, 238, 242, 248, 253, 258, 263, 268, 272, 275],
    },
    {
      ticker: 'COIN',
      name: 'Coinbase',
      price: 245.80,
      changePercent: 16.25,
      chartData: [211, 215, 220, 223, 227, 232, 236, 240, 243, 245],
    },
  ]

  const losers: Mover[] = [
    {
      ticker: 'INTC',
      name: 'Intel',
      price: 42.15,
      changePercent: -40.49,
      chartData: [70, 68, 65, 62, 58, 54, 50, 47, 44, 42],
    },
    {
      ticker: 'BA',
      name: 'Boeing',
      price: 185.20,
      changePercent: -56.81,
      chartData: [428, 410, 390, 360, 330, 290, 250, 220, 200, 185],
    },
    {
      ticker: 'DIS',
      name: 'Disney',
      price: 105.45,
      changePercent: -29.78,
      chartData: [150, 145, 140, 135, 128, 122, 116, 112, 108, 105],
    },
    {
      ticker: 'NFLX',
      name: 'Netflix',
      price: 625.30,
      changePercent: -15.32,
      chartData: [738, 730, 715, 700, 685, 670, 655, 642, 632, 625],
    },
    {
      ticker: 'SNAP',
      name: 'Snap Inc',
      price: 12.45,
      changePercent: -12.88,
      chartData: [14.3, 14.1, 13.9, 13.6, 13.3, 13.0, 12.8, 12.6, 12.5, 12.45],
    },
  ]

  const movers = tab === 'gainers' ? gainers : losers

  const renderChart = (data: number[], isPositive: boolean) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const width = 220
    const height = 80

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    }).join(' ')

    const pathPoints = `M0,${height} L${points} L${width},${height} Z`

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={isPositive ? 'gradient-gain' : 'gradient-loss'} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? 'var(--success)' : 'var(--danger)'} stopOpacity="0.3"/>
            <stop offset="100%" stopColor={isPositive ? 'var(--success)' : 'var(--danger)'} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path
          d={pathPoints}
          fill={`url(#${isPositive ? 'gradient-gain' : 'gradient-loss'})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? 'var(--success)' : 'var(--danger)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <div className="biggest-movers">
      <div className="movers-header">
        <div>
          <h2>Biggest Movers</h2>
          <p className="movers-subtitle">These assets have the biggest change in price over the last 24 hours</p>
        </div>
        <div className="movers-tabs">
          <button
            className={`movers-tab ${tab === 'gainers' ? 'active' : ''}`}
            onClick={() => setTab('gainers')}
          >
            Gainers
          </button>
          <button
            className={`movers-tab ${tab === 'losers' ? 'active' : ''}`}
            onClick={() => setTab('losers')}
          >
            Losers
          </button>
        </div>
      </div>

      <div className="movers-grid">
        {movers.map((mover) => (
          <div
            key={mover.ticker}
            className="mover-card"
            onClick={() => navigate(`/stock/${mover.ticker}`)}
          >
            <div className="mover-card-header">
              <div>
                <div className="mover-ticker">{mover.ticker}</div>
                <div className="mover-name">{mover.name}</div>
              </div>
              <button className="favorite-btn">
                <span className="material-symbols-outlined">star</span>
              </button>
            </div>
            <div className="mover-chart">
              {renderChart(mover.chartData, mover.changePercent >= 0)}
            </div>
            <div className="mover-data">
              <div className={`mover-change ${mover.changePercent >= 0 ? 'positive' : 'negative'}`}>
                {mover.changePercent >= 0 ? '↑' : '↓'}{Math.abs(mover.changePercent).toFixed(2)}%
              </div>
              <div className="mover-price">${mover.price.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .biggest-movers {
          width: 100%;
        }

        .movers-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .movers-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 0.25rem 0;
        }

        .movers-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin: 0;
        }

        .movers-tabs {
          display: flex;
          gap: 0.5rem;
          background: var(--surface-dark);
          padding: 0.25rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border-dark);
        }

        .movers-tab {
          padding: 0.5rem 1rem;
          background: transparent;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .movers-tab:hover {
          color: var(--text-primary);
        }

        .movers-tab.active {
          background: white;
          color: var(--text-primary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .movers-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
        }

        .mover-card {
          padding: 1rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mover-card:hover {
          background: var(--surface-hover);
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .mover-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .mover-ticker {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.125rem;
        }

        .mover-name {
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }

        .favorite-btn {
          background: transparent;
          border: none;
          padding: 0.25rem;
          cursor: pointer;
          color: var(--text-muted);
          transition: color 0.2s ease;
        }

        .favorite-btn:hover {
          color: var(--warning);
        }

        .favorite-btn .material-symbols-outlined {
          font-size: 1rem;
        }

        .mover-chart {
          margin-bottom: 0.75rem;
        }

        .mover-data {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mover-change {
          font-size: 0.875rem;
          font-weight: 700;
        }

        .mover-price {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        @media (max-width: 1600px) {
          .movers-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        @media (max-width: 1200px) {
          .movers-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .movers-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
