/**
 * Market Overview Widget
 * Shows major indices performance
 */

import { useState } from 'react'

interface IndexData {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
}

export default function MarketOverview() {
  const [indices] = useState<IndexData[]>([
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
              <span className="material-symbols-outlined index-change-icon">
                {index.change >= 0 ? 'arrow_upward' : 'arrow_downward'}
              </span>
              {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)} ({index.change >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%)
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
