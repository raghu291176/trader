/**
 * Achievements Page
 * Badge gallery showing earned and locked achievements with progress indicators
 */

import { useEffect, useState } from 'react'
import { apiService } from '../services/api'
import type { Achievement } from '../types'

const CATEGORIES = ['All', 'Trading', 'Streak', 'Social', 'Risk']

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAchievements()
  }, [])

  async function loadAchievements() {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getMyAchievements()
      setAchievements(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load achievements')
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'All'
    ? achievements
    : achievements.filter(a => a.category.toLowerCase() === filter.toLowerCase())

  const earnedCount = achievements.filter(a => a.earnedAt).length
  const totalCount = achievements.length

  return (
    <div className="achievements-page">
      <div className="achievements-header">
        <h1>Achievements</h1>
        {totalCount > 0 && (
          <span className="badge badge-earned-count">{earnedCount}/{totalCount} Earned</span>
        )}
      </div>

      {/* Category Filter */}
      <div className="achievements-filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`movers-tab ${filter === cat ? 'active' : ''}`}
            onClick={() => setFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && <div className="loading">Loading achievements...</div>}
      {error && <div className="error">Error: {error}</div>}

      {/* Badge Gallery Grid */}
      {!loading && !error && (
        <div className="achievements-grid">
          {filtered.length > 0 ? (
            filtered.map((a) => (
              <div key={a.id} className={`achievement-card ${a.earnedAt ? 'earned' : 'locked'}`}>
                <div className="achievement-card__icon">
                  <span className="material-symbols-outlined">{a.icon}</span>
                </div>
                <div className="achievement-card__name">{a.name}</div>
                <div className="achievement-card__desc">{a.description}</div>
                {a.earnedAt ? (
                  <div className="achievement-card__date">
                    Earned {new Date(a.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                ) : a.progressTarget > 0 ? (
                  <div className="achievement-card__progress">
                    <div className="achievement-progress-bar">
                      <div className="achievement-progress-fill" style={{ width: `${a.progress}%` }} />
                    </div>
                    <span className="achievement-progress-label">{a.progressCurrent}/{a.progressTarget}</span>
                  </div>
                ) : (
                  <div className="achievement-card__locked">Locked</div>
                )}
              </div>
            ))
          ) : (
            <p className="empty">No achievements found for this category</p>
          )}
        </div>
      )}
    </div>
  )
}
