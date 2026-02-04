/**
 * Main App Component
 * Handles authentication, routing and navigation
 */

import { useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import { apiService } from './services/api'
import Dashboard from './components/Dashboard'
import { BacktestForm } from './components/BacktestForm'
import { BacktestResults } from './components/BacktestResults'
import WatchlistManager from './components/WatchlistManager'
import type { BacktestResult } from './types'
import './App.css'

type TabType = 'dashboard' | 'backtest' | 'settings';

function App() {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)

  useEffect(() => {
    // Set token getter for API service
    apiService.setTokenGetter(async () => {
      return await getToken()
    })
  }, [getToken])

  const handleBacktestResults = (result: BacktestResult) => {
    setBacktestResult(result)
  }

  return (
    <div className="app">
      <header>
        <div className="header-left">
          <div className="logo-icon">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <h1>Portfolio Rotation Agent</h1>
        </div>
        <nav className="header-nav">
          <a
            href="#"
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
          >
            Dashboard
          </a>
          <a
            href="#"
            className={activeTab === 'backtest' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setActiveTab('backtest'); }}
          >
            Backtesting
          </a>
          <a
            href="#"
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
          >
            Settings
          </a>
        </nav>
        <div className="header-right">
          <div className="search-box">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search Ticker (e.g., AAPL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  setSelectedTicker(searchQuery.trim());
                  setActiveTab('dashboard');
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

      <main>
        <SignedOut>
          <div className="welcome">
            <h2>Welcome to Portfolio Rotation Agent</h2>
            <p>Professional investment portfolio management with AI-powered stock analysis</p>
            <SignInButton mode="modal">
              <button className="btn-primary">Sign In to Get Started</button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          {activeTab === 'dashboard' && (
            <Dashboard
              searchTicker={selectedTicker}
              onTickerSearched={() => setSelectedTicker(null)}
            />
          )}
          {activeTab === 'backtest' && (
            <div className="backtest-tab">
              <BacktestForm onResults={handleBacktestResults} />
              {backtestResult && <BacktestResults result={backtestResult} />}
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="settings-tab">
              <h2>Settings</h2>
              <WatchlistManager />
            </div>
          )}
        </SignedIn>
      </main>
    </div>
  )
}

export default App
