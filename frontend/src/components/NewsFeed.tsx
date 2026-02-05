/**
 * News Feed Widget
 * Shows latest market news - fetches from API when ticker provided
 */

import { useState, useEffect } from 'react'
import { apiService } from '../services/api'

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

interface NewsFeedProps {
  ticker?: string
}

const fallbackNews: NewsItem[] = [
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
]

export default function NewsFeed({ ticker }: NewsFeedProps) {
  const [news, setNews] = useState<NewsItem[]>(fallbackNews)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticker) return

    let cancelled = false
    setLoading(true)

    apiService.getNews(ticker).then((data) => {
      if (cancelled) return
      if (data && data.length > 0) {
        setNews(data.map((item: any, idx: number) => ({
          id: item.id || String(idx),
          headline: item.headline || item.title || '',
          source: item.source || '',
          url: item.url || '#',
          summary: item.summary || '',
          datetime: item.datetime ? item.datetime * 1000 : Date.now(),
          related: item.related || ticker,
          image: item.image,
        })))
      }
    }).catch(() => {
      // Keep fallback data on error
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [ticker])

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
      {loading && <div className="loading">Loading news...</div>}
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

    </div>
  )
}
