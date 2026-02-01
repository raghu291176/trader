/**
 * Main App Component
 * Handles authentication and routing
 */

import { useEffect } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import { apiService } from './services/api'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const { getToken } = useAuth()

  useEffect(() => {
    // Set token getter for API service
    apiService.setTokenGetter(async () => {
      return await getToken()
    })
  }, [getToken])

  return (
    <div className="app">
      <header>
        <h1>📈 Portfolio Rotation Agent</h1>
        <div className="user-section">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      <main>
        <SignedOut>
          <div className="welcome">
            <h2>Welcome to Portfolio Rotation Agent</h2>
            <p>Multi-user portfolio management with AI-powered rotation strategies</p>
            <SignInButton mode="modal">
              <button className="btn-primary">Sign In</button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <Dashboard />
        </SignedIn>
      </main>

      <footer>
        <p>Multi-User Edition • Powered by Clerk & Neon</p>
      </footer>
    </div>
  )
}

export default App
