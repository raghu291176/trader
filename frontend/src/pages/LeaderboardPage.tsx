/**
 * Leaderboard Page
 * Ranked table of traders with period filters, paper/live tabs, and user rank card
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { PortfolioMode, LeaderboardPeriod, LeaderboardResponse, UserRank } from '../types'
import ModeToggle from '../components/ModeToggle'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
]

export default function LeaderboardPage() {
  const [mode, setMode] = useState<PortfolioMode>('paper')
  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly')
  const [page, setPage] = useState(1)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [myRank, setMyRank] = useState<UserRank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLeaderboard()
  }, [mode, period, page])

  async function loadLeaderboard() {
    try {
      setLoading(true)
      setError(null)
      const [lb, rank] = await Promise.all([
        apiService.getLeaderboard(mode, period, page),
        apiService.getMyRank(mode, period),
      ])
      setLeaderboard(lb)
      setMyRank(rank)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  function handleModeChange(newMode: PortfolioMode) {
    setMode(newMode)
    setPage(1)
  }

  function handlePeriodChange(newPeriod: LeaderboardPeriod) {
    setPeriod(newPeriod)
    setPage(1)
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <div>
          <h1>Leaderboard</h1>
          <p className="text-muted">See how you stack up against other traders</p>
        </div>
        <ModeToggle mode={mode} onModeChange={handleModeChange} />
      </div>

      {/* Period Tabs */}
      <div className="leaderboard-tabs">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            className={`movers-tab ${period === p.value ? 'active' : ''}`}
            onClick={() => handlePeriodChange(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Your Rank Card */}
      {myRank && (
        <div className="card your-rank-card">
          <span className="material-symbols-outlined">emoji_events</span>
          <div>
            <div className="your-rank-card__rank">Your Rank: #{myRank.rank} of {myRank.totalUsers}</div>
            <div className="your-rank-card__percentile">Top {myRank.topPercent.toFixed(1)}%</div>
          </div>
          <div className={`your-rank-card__return ${myRank.returnPercent >= 0 ? 'positive' : 'negative'}`}>
            {myRank.returnPercent >= 0 ? '+' : ''}{myRank.returnPercent.toFixed(2)}%
          </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading && <div className="loading">Loading leaderboard...</div>}
      {error && <div className="error">Error: {error}</div>}

      {/* Leaderboard Table */}
      {!loading && !error && leaderboard && (
        <>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Trader</th>
                  <th className="text-right">Return %</th>
                  <th className="text-right">Sharpe</th>
                  <th className="text-right">Win Rate</th>
                  <th className="text-right">Trades</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.length > 0 ? (
                  leaderboard.entries.map((entry) => (
                    <tr key={entry.rank} className={entry.isCurrentUser ? 'leaderboard-row--self' : ''}>
                      <td><strong>#{entry.rank}</strong></td>
                      <td>
                        {entry.displayName}
                        {entry.isCurrentUser && <span className="badge badge-you">You</span>}
                      </td>
                      <td className={`text-right ${entry.returnPercent >= 0 ? 'positive' : 'negative'}`}>
                        {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent.toFixed(2)}%
                      </td>
                      <td className="text-right">{entry.sharpeRatio.toFixed(2)}</td>
                      <td className="text-right">{entry.winRate.toFixed(1)}%</td>
                      <td className="text-right">{entry.totalTrades}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="empty">No leaderboard data available for this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Privacy Note */}
          <p className="leaderboard-privacy">
            <span className="material-symbols-outlined">visibility_off</span>
            Only display names are shown. No specific holdings are visible to other users.
          </p>

          {/* Pagination */}
          {leaderboard.totalPages > 1 && (
            <div className="leaderboard-pagination">
              <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              <span>Page {page} of {leaderboard.totalPages}</span>
              <button className="btn-secondary" disabled={page >= leaderboard.totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
