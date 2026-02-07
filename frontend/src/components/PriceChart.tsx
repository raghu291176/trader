/**
 * Price Chart Component — Compact version
 * Constrained height, integrated timeframe + price info
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'

interface PriceChartProps {
  ticker: string
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y'

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export default function PriceChart({ ticker }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M')
  const [data, setData] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadChartData()
  }, [ticker, timeframe])

  async function loadChartData() {
    try {
      setLoading(true)
      setError(null)
      const chartData = await apiService.getChartData(ticker, timeframe)
      setData(chartData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="sd-chart-wrap"><div className="sd-chart-placeholder">Loading chart...</div></div>
  }

  if (error || !data || data.length === 0) {
    return <div className="sd-chart-wrap"><div className="sd-chart-placeholder">Unable to load price data</div></div>
  }

  const width = 800
  const height = 220
  const padding = { top: 12, right: 50, bottom: 24, left: 8 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  const currentPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const priceChange = currentPrice - firstPrice
  const priceChangePercent = (priceChange / firstPrice) * 100
  const isPositive = priceChange >= 0

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight
    return `${x},${y}`
  })

  const pathData = `M ${points.join(' L ')}`
  const areaPath = `${pathData} L ${padding.left + chartWidth},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`

  const gridLevels = [0, 0.5, 1].map(ratio => {
    const price = minPrice + priceRange * ratio
    const y = padding.top + chartHeight * (1 - ratio)
    return { price, y }
  })

  return (
    <div className="sd-chart-wrap">
      <div className="sd-chart-topbar">
        <div className="sd-chart-price-info">
          <span className="sd-chart-current">${currentPrice.toFixed(2)}</span>
          <span className={`sd-chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="sd-timeframes">
          {(['1D', '1W', '1M', '3M', '1Y'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              className={`sd-tf-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <svg
        className="sd-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {gridLevels.map(({ price, y }, i) => (
          <g key={i}>
            <line
              x1={padding.left} y1={y}
              x2={padding.left + chartWidth} y2={y}
              stroke="rgba(0,0,0,0.06)" strokeWidth="1"
            />
            <text
              x={padding.left + chartWidth + 4} y={y + 4}
              fill="#94a3b8" fontSize="10" fontFamily="Inter, sans-serif"
            >
              ${price.toFixed(0)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)'} />
        <path
          d={pathData} fill="none"
          stroke={isPositive ? '#10b981' : '#f43f5e'}
          strokeWidth="2" vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="sd-volume-strip">
        {data.map((d, i) => {
          const maxVolume = Math.max(...data.map(c => c.volume))
          const h = (d.volume / maxVolume) * 100
          return (
            <div
              key={i}
              className="sd-vol-bar"
              style={{
                height: `${h}%`,
                backgroundColor: d.close >= d.open ? '#10b981' : '#f43f5e',
                opacity: 0.25
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
