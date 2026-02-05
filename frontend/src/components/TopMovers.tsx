/**
 * Top Movers Widget
 * Shows top gainers and losers
 */

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Score } from '../types'

interface Mover {
  ticker: string
  price: number
  change: number
  changePercent: number
  volume: string
}

interface TopMoversProps {
  scores?: Score[]
}

export default function TopMovers({ scores }: TopMoversProps) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'gainers' | 'losers'>('gainers')

  const { gainers, losers } = useMemo(() => {
    const scoresWithPrice = scores?.filter(s => s.currentPrice && s.priceChange !== undefined) || []

    if (scoresWithPrice.length > 0) {
      const sorted = [...scoresWithPrice].sort((a, b) => (b.priceChangePercent || 0) - (a.priceChangePercent || 0))
      const g: Mover[] = sorted
        .filter(s => (s.priceChangePercent || 0) > 0)
        .slice(0, 4)
        .map(s => ({
          ticker: s.ticker,
          price: s.currentPrice || 0,
          change: s.priceChange || 0,
          changePercent: s.priceChangePercent || 0,
          volume: '--',
        }))
      const l: Mover[] = sorted
        .filter(s => (s.priceChangePercent || 0) < 0)
        .reverse()
        .slice(0, 4)
        .map(s => ({
          ticker: s.ticker,
          price: s.currentPrice || 0,
          change: s.priceChange || 0,
          changePercent: s.priceChangePercent || 0,
          volume: '--',
        }))
      return { gainers: g, losers: l }
    }

    return {
      gainers: [
        { ticker: 'NVDA', price: 725.50, change: 45.23, changePercent: 6.65, volume: '52.3M' },
        { ticker: 'META', price: 485.20, change: 28.15, changePercent: 6.16, volume: '18.2M' },
        { ticker: 'TSLA', price: 275.80, change: 15.42, changePercent: 5.92, volume: '95.4M' },
        { ticker: 'AMD', price: 165.30, change: 8.95, changePercent: 5.72, volume: '42.1M' },
      ] as Mover[],
      losers: [
        { ticker: 'INTC', price: 42.15, change: -3.85, changePercent: -8.37, volume: '35.2M' },
        { ticker: 'DIS', price: 105.45, change: -6.55, changePercent: -5.85, volume: '12.8M' },
        { ticker: 'BA', price: 185.20, change: -9.80, changePercent: -5.03, volume: '8.4M' },
        { ticker: 'NFLX', price: 625.30, change: -28.70, changePercent: -4.39, volume: '5.2M' },
      ] as Mover[],
    }
  }, [scores])

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

    </div>
  )
}
