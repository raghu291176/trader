/**
 * Stock Detail Page
 * Dedicated page for viewing comprehensive stock analysis
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
    <div className="stock-detail-page">
      <button 
        className="back-button" 
        onClick={() => navigate(-1)}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>
      
      {/* Reuse TickerAnalysis but render as full page */}
      <TickerAnalysis 
        ticker={ticker.toUpperCase()} 
        onClose={() => navigate('/dashboard')} 
      />
    </div>
  )
}
