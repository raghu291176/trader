/**
 * News Feed Widget
 * Shows latest market news
 */

import { useEffect, useState } from 'react'

interface NewsItem {
  id: string
  headline: string
  source: string
  url: string
  summary: string
  datetime: number
  related: string
  image?: string
}

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: '1',
      headline: 'Fed Holds Rates Steady, Signals Cautious Approach',
      source: 'Reuters',
      url: '#',
      summary: 'Federal Reserve maintains interest rates amid economic uncertainty...',
      datetime: Date.now() - 3600000,
      related: 'SPX',
    },
    {
      id: '2',
      headline: 'Tech Giants Report Strong Q4 Earnings',
      source: 'Bloomberg',
      url: '#',
      summary: 'Major technology companies exceed analyst expectations...',
      datetime: Date.now() - 7200000,
      related: 'AAPL',
    },
    {
      id: '3',
      headline: 'Oil Prices Surge on Supply Concerns',
      source: 'WSJ',
      url: '#',
      summary: 'Crude oil prices climb as OPEC announces production cuts...',
      datetime: Date.now() - 10800000,
      related: 'XLE',
    },
  ])

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <div className="news-feed-widget">
      <div className="news-list">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item"
          >
            <div className="news-content">
              <div className="news-header">
                <span className="news-source">{item.source}</span>
                <span className="news-time">{formatTimeAgo(item.datetime)}</span>
              </div>
              <div className="news-headline">{item.headline}</div>
              <div className="news-summary">{item.summary}</div>
              {item.related && (
                <div className="news-related">
                  <span className="material-symbols-outlined">label</span>
                  {item.related}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>

      <style>{`
        .news-feed-widget {
          width: 100%;
        }

        .news-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .news-item {
          display: block;
          padding: 0.875rem;
          background: var(--surface-dark);
          border: 1px solid var(--border-dark);
          border-radius: 0.375rem;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .news-item:hover {
          border-color: var(--primary);
          background: rgba(0, 200, 5, 0.02);
          transform: translateX(2px);
        }

        .news-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.375rem;
        }

        .news-source {
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .news-time {
          font-size: 0.6875rem;
          color: var(--text-secondary);
        }

        .news-headline {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 0.375rem;
        }

        .news-summary {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0.5rem;
        }

        .news-related {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.2rem 0.5rem;
          background: rgba(0, 200, 5, 0.08);
          border: 1px solid rgba(0, 200, 5, 0.2);
          border-radius: 0.3rem;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--primary);
        }

        .news-related .material-symbols-outlined {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
