/**
 * Settings Page
 * User profile, risk parameters, paper/live mode, leaderboard visibility, and watchlist management
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { UserProfile } from '../types'
import { usePortfolioMode } from '../context/PortfolioModeContext'
import ConfirmationModal from '../components/ConfirmationModal'
import WatchlistManager from '../components/WatchlistManager'

export default function SettingsPage() {
  const { mode, setMode } = usePortfolioMode()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [initialCapital, setInitialCapital] = useState(10000)
  const [stopLoss, setStopLoss] = useState(5)
  const [circuitBreaker, setCircuitBreaker] = useState(10)
  const [cashReserve, setCashReserve] = useState(20)

  // Leaderboard visibility state
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(true)
  const [displayName, setDisplayName] = useState('')

  // Go-Live modal state
  const [showGoLiveModal, setShowGoLiveModal] = useState(false)
  const [goLiveConfirmation, setGoLiveConfirmation] = useState('')
  const [goLiveLoading, setGoLiveLoading] = useState(false)

  useEffect(() => {
    loadProfile()
    loadVisibility()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      const data = await apiService.getUserProfile()
      setProfile(data)
      setFullName(data.full_name || '')
      setEmail(data.email || '')
      setInitialCapital(data.initial_capital || 10000)
      setStopLoss(data.settings?.stopLossPercent ?? 5)
      setCircuitBreaker(data.settings?.circuitBreakerPercent ?? 10)
      setCashReserve(data.settings?.cashReservePercent ?? 20)
    } catch {
      // Profile may not exist yet, use defaults
    } finally {
      setLoading(false)
    }
  }

  async function loadVisibility() {
    try {
      const vis = await apiService.getVisibility()
      setShowOnLeaderboard(vis.showOnLeaderboard)
      setDisplayName(vis.displayName || '')
    } catch {
      // Defaults are fine
    }
  }

  async function handleSaveProfile() {
    try {
      setSaving(true)
      setMessage(null)
      await apiService.updateUserProfile({
        full_name: fullName,
        email,
        initial_capital: initialCapital,
        settings: {
          ...profile?.settings,
          stopLossPercent: stopLoss,
          circuitBreakerPercent: circuitBreaker,
          cashReservePercent: cashReserve,
        },
      })
      await apiService.updateVisibility({ showOnLeaderboard, displayName })
      setMessage({ type: 'success', text: 'Settings saved successfully' })
      await loadProfile()
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  async function handleGoLive() {
    if (goLiveConfirmation !== 'GO LIVE') return
    try {
      setGoLiveLoading(true)
      await apiService.goLive(goLiveConfirmation)
      setMode('live')
      setShowGoLiveModal(false)
      setGoLiveConfirmation('')
      setMessage({ type: 'success', text: 'Congratulations! You are now trading live.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to switch to live trading. Please try again.' })
    } finally {
      setGoLiveLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading settings...</div>
  }

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage(null)}>&times;</button>
        </div>
      )}

      {/* User Profile Section */}
      <div className="card settings-section">
        <h3>
          <span className="material-symbols-outlined">person</span>
          User Profile
        </h3>
        <div className="settings-grid">
          <div className="settings-field">
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div className="settings-field">
            <label>Initial Capital ($)</label>
            <input type="number" value={initialCapital} onChange={(e) => setInitialCapital(Number(e.target.value))} min={0} />
          </div>
        </div>
      </div>

      {/* Risk Parameters Section */}
      <div className="card settings-section">
        <h3>
          <span className="material-symbols-outlined">shield</span>
          Risk Parameters
        </h3>
        <div className="settings-grid">
          <div className="settings-field">
            <label>Stop-Loss (%)</label>
            <input type="number" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} min={0} max={100} step={0.5} />
            <span className="settings-hint">Maximum loss per position before auto-sell</span>
          </div>
          <div className="settings-field">
            <label>Circuit Breaker (%)</label>
            <input type="number" value={circuitBreaker} onChange={(e) => setCircuitBreaker(Number(e.target.value))} min={0} max={100} step={0.5} />
            <span className="settings-hint">Portfolio drawdown threshold to halt trading</span>
          </div>
          <div className="settings-field">
            <label>Cash Reserve (%)</label>
            <input type="number" value={cashReserve} onChange={(e) => setCashReserve(Number(e.target.value))} min={0} max={100} step={1} />
            <span className="settings-hint">Minimum cash percentage to maintain</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Visibility Section */}
      <div className="card settings-section">
        <h3>
          <span className="material-symbols-outlined">leaderboard</span>
          Leaderboard Settings
        </h3>
        <div className="settings-grid">
          <div className="settings-field">
            <label>Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Anonymous Trader" />
            <span className="settings-hint">Shown on the leaderboard instead of your real name</span>
          </div>
          <div className="settings-field">
            <label>Show on Leaderboard</label>
            <label className="toggle-switch">
              <input type="checkbox" checked={showOnLeaderboard} onChange={(e) => setShowOnLeaderboard(e.target.checked)} />
              <span className="toggle-slider"></span>
            </label>
            <span className="settings-hint">When disabled, your rank is hidden from other traders</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button className="btn-primary" onClick={handleSaveProfile} disabled={saving}>
          <span className="material-symbols-outlined">save</span>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Go Live Section - only in paper mode */}
      {mode === 'paper' && (
        <div className="card settings-section go-live-section">
          <h3>
            <span className="material-symbols-outlined">rocket_launch</span>
            Go Live
          </h3>
          <p className="go-live-description">
            Ready to trade with real money? Graduate from paper trading to live mode.
            Your watchlists and settings will carry over. This action cannot be undone.
          </p>
          <button className="btn-primary btn-go-live" onClick={() => setShowGoLiveModal(true)}>
            <span className="material-symbols-outlined">arrow_forward</span>
            Graduate to Live Trading
          </button>
        </div>
      )}

      {/* Watchlist Management Section */}
      <WatchlistManager />

      {/* Go Live Confirmation Modal */}
      <ConfirmationModal
        isOpen={showGoLiveModal}
        onClose={() => { setShowGoLiveModal(false); setGoLiveConfirmation(''); }}
        title="Go Live"
        icon="rocket_launch"
      >
        <div className="go-live-modal-content">
          <p>
            You are about to switch from paper trading to live trading.
            Your watchlists and settings will carry over, but your paper trading history will be preserved separately.
          </p>
          <div className="go-live-confirm-field">
            <label>Type <strong>GO LIVE</strong> to confirm:</label>
            <input
              type="text"
              value={goLiveConfirmation}
              onChange={(e) => setGoLiveConfirmation(e.target.value.toUpperCase())}
              placeholder="GO LIVE"
            />
          </div>
          <div className="go-live-modal-actions">
            <button className="btn-secondary" onClick={() => { setShowGoLiveModal(false); setGoLiveConfirmation(''); }} disabled={goLiveLoading}>
              Cancel
            </button>
            <button className="btn-primary btn-go-live" disabled={goLiveConfirmation !== 'GO LIVE' || goLiveLoading} onClick={handleGoLive}>
              {goLiveLoading ? 'Processing...' : 'Confirm Go Live'}
            </button>
          </div>
        </div>
      </ConfirmationModal>
    </div>
  )
}
