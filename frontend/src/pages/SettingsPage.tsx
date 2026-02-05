/**
 * Settings Page
 * User profile, risk parameters, and watchlist management
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { UserProfile } from '../types'
import WatchlistManager from '../components/WatchlistManager'

export default function SettingsPage() {
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

  useEffect(() => {
    loadProfile()
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
      setMessage({ type: 'success', text: 'Settings saved successfully' })
      await loadProfile()
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
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
          <button onClick={() => setMessage(null)}>×</button>
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
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <div className="settings-field">
            <label>Initial Capital ($)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              min={0}
            />
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
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(Number(e.target.value))}
              min={0}
              max={100}
              step={0.5}
            />
            <span className="settings-hint">Maximum loss per position before auto-sell</span>
          </div>
          <div className="settings-field">
            <label>Circuit Breaker (%)</label>
            <input
              type="number"
              value={circuitBreaker}
              onChange={(e) => setCircuitBreaker(Number(e.target.value))}
              min={0}
              max={100}
              step={0.5}
            />
            <span className="settings-hint">Portfolio drawdown threshold to halt trading</span>
          </div>
          <div className="settings-field">
            <label>Cash Reserve (%)</label>
            <input
              type="number"
              value={cashReserve}
              onChange={(e) => setCashReserve(Number(e.target.value))}
              min={0}
              max={100}
              step={1}
            />
            <span className="settings-hint">Minimum cash percentage to maintain</span>
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

      {/* Watchlist Management Section */}
      <WatchlistManager />
    </div>
  )
}
