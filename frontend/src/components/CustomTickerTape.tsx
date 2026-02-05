import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import './CustomTickerTape.css'

interface TickerData {
  symbol: string
  price: number
  change: number
  changePercent: number
}

const TICKER_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'JPM', 'BAC', 'NFLX']

export default function CustomTickerTape() {
  const navigate = useNavigate()
  const [tickers, setTickers] = useState<TickerData[]>([])

  useEffect(() => {
    loadTickerData()
    const interval = setInterval(loadTickerData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  async function loadTickerData() {
    try {
      // Fetch technical indicators which include current price and changes
      const tickerPromises = TICKER_SYMBOLS.map(async (symbol) => {
        try {
          const data = await apiService.getTechnicalIndicators(symbol)
          return {
            symbol,
            price: data?.currentPrice || 0,
            change: data?.priceChange || 0,
            changePercent: data?.priceChangePercent || 0
          }
        } catch {
          return {
            symbol,
            price: 0,
            change: 0,
            changePercent: 0
          }
        }
      })

      const results = await Promise.all(tickerPromises)
      setTickers(results.filter(t => t.price > 0))
    } catch (error) {
      console.error('Failed to load ticker data:', error)
    }
  }

  const handleTickerClick = (symbol: string) => {
    navigate(`/stock/${symbol}`)
  }

  // Duplicate tickers for seamless loop
  const displayTickers = [...tickers, ...tickers]

  return (
    <div className="custom-ticker-tape">
      <div className="ticker-track">
        {displayTickers.map((ticker, idx) => (
          <div
            key={`${ticker.symbol}-${idx}`}
            className="ticker-item"
            onClick={() => handleTickerClick(ticker.symbol)}
          >
            <span className="ticker-symbol">{ticker.symbol}</span>
            <span className="ticker-price">${ticker.price.toFixed(2)}</span>
            <span className={`ticker-change ${ticker.change >= 0 ? 'positive' : 'negative'}`}>
              {ticker.change >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
