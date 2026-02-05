/**
 * Biggest Movers Widget (Kraken-inspired)
 * Shows assets with biggest price changes with larger charts
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Score } from '../types'

interface Mover {
  ticker: string
  name: string
  price: number
  changePercent: number
  chartData?: number[]
}

interface BiggestMoversProps {
  scores?: Score[]
}

export default function BiggestMovers({ scores }: BiggestMoversProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const { gainers, losers } = useMemo(() => {
    const scoresWithPrice = scores?.filter(s => s.currentPrice && s.priceChangePercent !== undefined) || []

    if (scoresWithPrice.length > 0) {
      const sorted = [...scoresWithPrice].sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0))
      const g: Mover[] = sorted
        .filter(s => (s.priceChangePercent || 0) > 0)
        .slice(0, 5)
        .map(s => ({
          ticker: s.ticker,
          name: s.ticker,
          price: s.currentPrice || 0,
          changePercent: s.priceChangePercent || 0,
        }))
      const l: Mover[] = sorted
        .filter(s => (s.priceChangePercent || 0) < 0)
        .reverse()
        .slice(0, 5)
        .map(s => ({
          ticker: s.ticker,
          name: s.ticker,
          price: s.currentPrice || 0,
          changePercent: s.priceChangePercent || 0,
        }))
      return { gainers: g, losers: l }
    }

    // Fallback static data
    return {
      gainers: [
        { ticker: 'NVDA', name: 'NVIDIA', price: 725.50, changePercent: 21.08, chartData: [600, 610, 625, 640, 655, 670, 685, 700, 715, 725] },
        { ticker: 'META', name: 'Meta Platforms', price: 485.20, changePercent: 19.34, chartData: [405, 410, 420, 435, 445, 455, 465, 472, 480, 485] },
        { ticker: 'AMD', name: 'AMD', price: 165.30, changePercent: 17.64, chartData: [140, 142, 145, 150, 153, 156, 158, 161, 163, 165] },
        { ticker: 'TSLA', name: 'Tesla', price: 275.80, changePercent: 17.61, chartData: [234, 238, 242, 248, 253, 258, 263, 268, 272, 275] },
        { ticker: 'COIN', name: 'Coinbase', price: 245.80, changePercent: 16.25, chartData: [211, 215, 220, 223, 227, 232, 236, 240, 243, 245] },
      ] as Mover[],
      losers: [
        { ticker: 'INTC', name: 'Intel', price: 42.15, changePercent: -40.49, chartData: [70, 68, 65, 62, 58, 54, 50, 47, 44, 42] },
        { ticker: 'BA', name: 'Boeing', price: 185.20, changePercent: -56.81, chartData: [428, 410, 390, 360, 330, 290, 250, 220, 200, 185] },
        { ticker: 'DIS', name: 'Disney', price: 105.45, changePercent: -29.78, chartData: [150, 145, 140, 135, 128, 122, 116, 112, 108, 105] },
        { ticker: 'NFLX', name: 'Netflix', price: 625.30, changePercent: -15.32, chartData: [738, 730, 715, 700, 685, 670, 655, 642, 632, 625] },
        { ticker: 'SNAP', name: 'Snap Inc', price: 12.45, changePercent: -12.88, chartData: [14.3, 14.1, 13.9, 13.6, 13.3, 13.0, 12.8, 12.6, 12.5, 12.45] },
      ] as Mover[],
    }
  }, [scores])

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
      <svg width={width} height={height} className="mover-chart-svg">
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
            {mover.chartData && (
              <div className="mover-chart">
                {renderChart(mover.chartData, mover.changePercent >= 0)}
              </div>
            )}
            <div className="mover-data">
              <div className={`mover-change ${mover.changePercent >= 0 ? 'positive' : 'negative'}`}>
                {mover.changePercent >= 0 ? '↑' : '↓'}{Math.abs(mover.changePercent).toFixed(2)}%
              </div>
              <div className="mover-price">${mover.price.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
