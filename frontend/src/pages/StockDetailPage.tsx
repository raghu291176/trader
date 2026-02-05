/**
 * Stock Detail Page
 * Dedicated page for viewing comprehensive stock analysis
 */

import { useParams, useNavigate } from 'react-router-dom'
import TickerAnalysis from '../components/TickerAnalysis'
import NewsFeed from '../components/NewsFeed'

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()

  if (!ticker) {
    return <div>No ticker specified</div>
  }

  return (
    <div className="stock-detail-page">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>

      {/* Render TickerAnalysis inline (not as modal) */}
      <TickerAnalysis
        ticker={ticker.toUpperCase()}
        onClose={() => navigate('/dashboard')}
        inline
      />

      {/* Market News Feed */}
      <div className="card stock-detail-news-card">
        <h2>
          <span className="material-symbols-outlined">newspaper</span>
          Market News
        </h2>
        <NewsFeed ticker={ticker} />
      </div>
    </div>
  )
}
