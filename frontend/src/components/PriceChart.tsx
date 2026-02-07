/**
 * Price Chart Component
 * Displays historical price data with timeframe selectors
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
    return (
      <div className="chart-container">
        <div className="chart-loading">Loading chart...</div>
      </div>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-error">Unable to load price data</div>
      </div>
    )
  }

  // Calculate chart dimensions and scales
  const width = 800
  const height = 300
  const padding = { top: 20, right: 60, bottom: 40, left: 10 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const prices = data.map(d => d.close)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice

  const currentPrice = prices[prices.length - 1]
  const firstPrice = prices[0]
  const priceChange = currentPrice - firstPrice
  const priceChangePercent = (priceChange / firstPrice) * 100
  const isPositive = priceChange >= 0

  // Generate SVG path for price line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - ((d.close - minPrice) / priceRange) * chartHeight
    return `${x},${y}`
  })

  const pathData = `M ${points.join(' L ')}`

  // Generate area fill path
  const areaPath = `${pathData} L ${padding.left + chartWidth},${padding.top + chartHeight} L ${padding.left},${padding.top + chartHeight} Z`

  return (
    <div className="chart-container">
      {/* Timeframe Selector */}
      <div className="chart-header">
        <div className="chart-info">
          <div className="chart-price">${currentPrice.toFixed(2)}</div>
          <div className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
        <div className="timeframe-selector">
          {(['1D', '1W', '1M', '3M', '1Y'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <svg
        className="price-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="1"
              />
            </g>
          )
        })}

        {/* Area fill */}
        <path
          d={areaPath}
          fill={isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'}
        />

        {/* Price line */}
        <path
          d={pathData}
          fill="none"
          stroke={isPositive ? '#10b981' : '#f43f5e'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Price labels */}
        {[maxPrice, minPrice].map((price, i) => {
          const y = padding.top + (i === 0 ? 0 : chartHeight)
          return (
            <text
              key={i}
              x={padding.left + chartWidth + 5}
              y={y + (i === 0 ? 15 : -5)}
              fill="#91adca"
              fontSize="12"
              fontFamily="Manrope, sans-serif"
            >
              ${price.toFixed(2)}
            </text>
          )
        })}
      </svg>

      {/* Volume bars */}
      <div className="volume-bars">
        {data.map((d, i) => {
          const maxVolume = Math.max(...data.map(c => c.volume))
          const heightPercent = (d.volume / maxVolume) * 100
          return (
            <div
              key={i}
              className="volume-bar"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: d.close >= d.open ? '#10b981' : '#f43f5e',
                opacity: 0.3
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
