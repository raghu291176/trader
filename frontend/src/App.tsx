/**
 * Main App Component
 * Handles authentication, routing and navigation
 */

import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import { apiService } from './services/api'
import Dashboard from './components/Dashboard'
import { BacktestForm } from './components/BacktestForm'
import { BacktestResults } from './components/BacktestResults'
import StockDetailPage from './pages/StockDetailPage'
import SettingsPage from './pages/SettingsPage'
import CustomTickerTape from './components/CustomTickerTape'
import type { BacktestResult } from './types'
import './App.css'

function App() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // Set token getter for API service
    apiService.setTokenGetter(async () => {
      return await getToken()
    })
  }, [getToken])

  const handleBacktestResults = (result: BacktestResult) => {
    setBacktestResult(result)
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/stock/${query.trim().toUpperCase()}`)
      setSearchQuery('')
    }
  }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path)

  return (
    <div className="app">
      <div className="app-header-container">
        <header>
          <div className="header-left">
            <Link to="/dashboard" className="logo">
              <span className="material-symbols-outlined">trending_up</span>
              <span>Trader</span>
            </Link>
            <nav>
              <Link
                to="/dashboard"
                className={isActive('/dashboard') ? 'active' : ''}
              >
                Dashboard
              </Link>
              <Link
                to="/backtest"
                className={isActive('/backtest') ? 'active' : ''}
              >
                Backtesting
              </Link>
              <Link
                to="/settings"
                className={isActive('/settings') ? 'active' : ''}
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="header-right">
            <div className="search-container">
              <span className="material-symbols-outlined search-icon">search</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search Ticker (e.g., AAPL)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
              />
            </div>
            <SignedIn>
              <button className="icon-btn">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </header>

        {/* Custom Ticker Tape - Click stocks to view details */}
        <CustomTickerTape />
      </div>

      <main>
        <SignedOut>
          <div className="welcome">
            <h2>Welcome to Trader</h2>
            <p>Professional investment portfolio management with AI-powered stock analysis</p>
            <SignInButton mode="modal">
              <button className="btn-primary">Sign In to Get Started</button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/stock/:ticker" element={<StockDetailPage />} />
            <Route path="/backtest" element={
              <div className="backtest-tab">
                <BacktestForm onResults={handleBacktestResults} />
                {backtestResult && <BacktestResults result={backtestResult} />}
              </div>
            } />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SignedIn>
      </main>
    </div>
  )
}

export default App
