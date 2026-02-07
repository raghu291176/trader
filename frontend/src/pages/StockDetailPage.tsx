/**
 * Stock Detail Page
 * Semantic HTML5 — article/section/aside structure, mobile-first
 */

import { useParams, useNavigate } from 'react-router-dom'
import TickerAnalysis from '../components/TickerAnalysis'

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const navigate = useNavigate()

  if (!ticker) {
    return <div>No ticker specified</div>
  }

  return (
    <article className="stock-detail-page" aria-label={`${ticker.toUpperCase()} stock analysis`}>
      <nav className="sd-back-nav" aria-label="Back navigation">
        <button
          className="back-button"
          onClick={() => navigate(-1)}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
      </nav>

      <TickerAnalysis
        ticker={ticker.toUpperCase()}
        onClose={() => navigate('/dashboard')}
        inline
      />
    </article>
  )
}
