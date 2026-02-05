/**
 * Watchlist Manager Component
 * Allows users to manage their stock watchlists
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'

export default function WatchlistManager() {
  const [watchlists, setWatchlists] = useState<Array<{ id: number; name: string; tickers: string[] }>>([])
  const [selectedWatchlist] = useState<string>('default')
  const [newTicker, setNewTicker] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadWatchlists()
  }, [])

  async function loadWatchlists() {
    try {
      setLoading(true)
      const data = await apiService.getWatchlists()
      setWatchlists(data)

      // If no default watchlist exists, create one
      if (!data.find(w => w.name === 'default')) {
        await apiService.saveWatchlist('default', [])
        await loadWatchlists()
      }
    } catch (err) {
      console.error('Failed to load watchlists:', err)
    } finally {
      setLoading(false)
    }
  }

  async function addTicker() {
    const ticker = newTicker.trim().toUpperCase()
    if (!ticker) return

    const watchlist = watchlists.find(w => w.name === selectedWatchlist)
    if (!watchlist) return

    if (watchlist.tickers.includes(ticker)) {
      setMessage({ type: 'error', text: `${ticker} is already in your watchlist` })
      return
    }

    try {
      const updatedTickers = [...watchlist.tickers, ticker]
      await apiService.saveWatchlist(selectedWatchlist, updatedTickers)
      setMessage({ type: 'success', text: `Added ${ticker} to watchlist` })
      setNewTicker('')
      await loadWatchlists()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to add ticker' })
    }
  }

  async function removeTicker(ticker: string) {
    const watchlist = watchlists.find(w => w.name === selectedWatchlist)
    if (!watchlist) return

    try {
      const updatedTickers = watchlist.tickers.filter(t => t !== ticker)
      await apiService.saveWatchlist(selectedWatchlist, updatedTickers)
      setMessage({ type: 'success', text: `Removed ${ticker} from watchlist` })
      await loadWatchlists()
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove ticker' })
    }
  }

  const currentWatchlist = watchlists.find(w => w.name === selectedWatchlist)

  if (loading) {
    return <div className="loading">Loading watchlists...</div>
  }

  return (
    <div className="watchlist-manager">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>×</button>
        </div>
      )}

      <div className="card">
        <h2>
          <span className="material-symbols-outlined">list</span>
          Manage Watchlist
        </h2>

        <div className="watchlist-controls">
          <div className="form-group">
            <label>Add Stock Ticker</label>
            <div className="ticker-input-group">
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && addTicker()}
                placeholder="Enter ticker symbol (e.g., AAPL)"
                className="ticker-input"
              />
              <button onClick={addTicker} className="btn-primary">
                <span className="material-symbols-outlined">add</span>
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="watchlist-tickers">
          {currentWatchlist && currentWatchlist.tickers.length > 0 ? (
            <div className="tickers-grid">
              {currentWatchlist.tickers.map((ticker) => (
                <div key={ticker} className="ticker-chip">
                  <span className="ticker-symbol">{ticker}</span>
                  <button
                    onClick={() => removeTicker(ticker)}
                    className="remove-btn"
                    title="Remove from watchlist"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="material-symbols-outlined">view_list</span>
              <p>No stocks in your watchlist</p>
              <p className="hint">Add stock tickers above to start tracking them</p>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
