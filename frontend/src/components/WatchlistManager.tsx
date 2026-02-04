/**
 * Watchlist Manager Component
 * Allows users to manage their stock watchlists
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'

export default function WatchlistManager() {
  const [watchlists, setWatchlists] = useState<Array<{ id: number; name: string; tickers: string[] }>>([])
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>('default')
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

      <style>{`
        .watchlist-manager {
          max-width: 800px;
        }

        .watchlist-controls {
          margin-bottom: 2rem;
        }

        .ticker-input-group {
          display: flex;
          gap: 0.75rem;
        }

        .ticker-input {
          flex: 1;
          background: var(--surface-darker);
          border: 1px solid var(--border-dark);
          color: var(--text-primary);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.9375rem;
          font-family: 'Fira Code', monospace;
          text-transform: uppercase;
        }

        .ticker-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .ticker-input::placeholder {
          text-transform: none;
          font-family: system-ui, sans-serif;
        }

        .tickers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .ticker-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface-darker);
          border: 1px solid var(--border-dark);
          border-radius: 0.5rem;
          padding: 0.75rem 1rem;
          transition: all 0.2s;
        }

        .ticker-chip:hover {
          border-color: var(--primary);
        }

        .ticker-symbol {
          font-family: 'Fira Code', monospace;
          font-weight: 600;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .remove-btn:hover {
          color: var(--rose);
        }

        .remove-btn .material-symbols-outlined {
          font-size: 1.125rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1.5rem;
          color: var(--text-secondary);
        }

        .empty-state .material-symbols-outlined {
          font-size: 3rem;
          opacity: 0.3;
          margin-bottom: 1rem;
        }

        .empty-state p {
          margin: 0.5rem 0;
        }

        .empty-state .hint {
          font-size: 0.875rem;
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}
