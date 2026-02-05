/**
 * Market Hot Widget - Professional Fintech Design
 * Horizontal scroll with pulse cards
 */

import { useNavigate } from 'react-router-dom'

interface HotStock {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  sparkline: number[]
}

export default function MarketHot() {
  const navigate = useNavigate()

  const trending: HotStock[] = [
    { ticker: 'NVDA', name: 'NVIDIA', price: 725.50, change: 45.23, changePercent: 6.65, sparkline: [680, 685, 690, 695, 710, 725] },
    { ticker: 'TSLA', name: 'Tesla', price: 275.80, change: 15.42, changePercent: 5.92, sparkline: [260, 262, 268, 270, 272, 275] },
    { ticker: 'AMD', name: 'AMD', price: 165.30, change: 8.95, changePercent: 5.72, sparkline: [156, 158, 160, 162, 164, 165] },
    { ticker: 'META', name: 'Meta', price: 485.20, change: 28.15, changePercent: 6.16, sparkline: [457, 460, 470, 475, 480, 485] },
    { ticker: 'AAPL', name: 'Apple', price: 185.25, change: 5.15, changePercent: 2.86, sparkline: [180, 181, 182, 183, 184, 185] },
  ]

  const mostBought: HotStock[] = [
    { ticker: 'AAPL', name: 'Apple', price: 185.25, change: 5.15, changePercent: 2.86, sparkline: [180, 181, 182, 183, 184, 185] },
    { ticker: 'MSFT', name: 'Microsoft', price: 415.30, change: 8.20, changePercent: 2.01, sparkline: [407, 408, 410, 412, 414, 415] },
    { ticker: 'GOOGL', name: 'Alphabet', price: 142.50, change: 2.80, changePercent: 2.00, sparkline: [139, 140, 141, 141, 142, 142] },
    { ticker: 'AMZN', name: 'Amazon', price: 178.90, change: 4.50, changePercent: 2.58, sparkline: [174, 175, 176, 177, 178, 178] },
    { ticker: 'SPY', name: 'S&P 500 ETF', price: 582.30, change: 4.60, changePercent: 0.80, sparkline: [577, 578, 579, 580, 581, 582] },
  ]

  const mostSold: HotStock[] = [
    { ticker: 'INTC', name: 'Intel', price: 42.15, change: -3.85, changePercent: -8.37, sparkline: [46, 45, 44, 43, 42, 42] },
    { ticker: 'DIS', name: 'Disney', price: 105.45, change: -6.55, changePercent: -5.85, sparkline: [112, 110, 108, 107, 106, 105] },
    { ticker: 'BA', name: 'Boeing', price: 185.20, change: -9.80, changePercent: -5.03, sparkline: [195, 192, 190, 188, 186, 185] },
    { ticker: 'NFLX', name: 'Netflix', price: 625.30, change: -28.70, changePercent: -4.39, sparkline: [654, 650, 645, 638, 630, 625] },
    { ticker: 'COIN', name: 'Coinbase', price: 245.80, change: -12.40, changePercent: -4.80, sparkline: [258, 255, 252, 250, 247, 245] },
  ]

  const renderSparkline = (data: number[], isPositive: boolean) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const width = 80
    const height = 32
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    }).join(' ')

    return (
      <svg width={width} height={height} className="pulse-card__chart">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? '#00D395' : '#FF4757'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const renderPulseCard = (stock: HotStock) => {
    const isPositive = stock.changePercent >= 0

    return (
      <div
        key={stock.ticker}
        className="pulse-card"
        onClick={() => navigate(`/stock/${stock.ticker}`)}
      >
        <div className="pulse-card__header">
          <div>
            <div className="pulse-card__ticker">{stock.ticker}</div>
            <div className="pulse-card__name">{stock.name}</div>
          </div>
        </div>
        {renderSparkline(stock.sparkline, isPositive)}
        <div className="pulse-card__footer">
          <div className="pulse-card__price">
            ${stock.price.toFixed(2)}
          </div>
          <div className={`pulse-card__change pulse-card__change--${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '↑' : '↓'}{Math.abs(stock.changePercent).toFixed(2)}%
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Trending Section */}
      <div className="market-pulse-container">
        <div className="section-header" style={{ paddingTop: 0, marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Trending
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Highest 24h trading volume change
          </p>
        </div>
        <div className="market-pulse">
          {trending.map(renderPulseCard)}
        </div>
      </div>

      {/* Most Bought Section */}
      <div className="market-pulse-container">
        <div className="section-header" style={{ paddingTop: 0, marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Most bought
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Top 5 assets bought in the past 24h
          </p>
        </div>
        <div className="market-pulse">
          {mostBought.map(renderPulseCard)}
        </div>
      </div>

      {/* Most Sold Section */}
      <div className="market-pulse-container">
        <div className="section-header" style={{ paddingTop: 0, marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Most sold
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Top 5 assets sold in the past 24h
          </p>
        </div>
        <div className="market-pulse">
          {mostSold.map(renderPulseCard)}
        </div>
      </div>
    </div>
  )
}
