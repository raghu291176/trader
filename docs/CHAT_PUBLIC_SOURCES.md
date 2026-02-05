# Portfolio Assistant - Public Sources Integration

## Overview

The Portfolio Assistant chat now searches both **internal portfolio data** and **public market sources** to provide comprehensive, real-time answers to user questions.

## Data Sources

### Internal Sources (RAG Database)
- Portfolio performance metrics
- Active positions and entry prices
- Trade history and rotation decisions
- Scoring algorithm and strategy rules
- Risk management parameters
- Technical indicators (RSI, MACD, Bollinger Bands)

### Public Sources (Real-time)
1. **Financial News**
   - Latest news articles from major sources
   - Headlines and summaries
   - Sentiment analysis
   - Timestamps for recency

2. **Analyst Reports**
   - Current analyst recommendations (Strong Buy, Buy, Hold, Sell, Strong Sell)
   - Consensus ratings and percentages
   - Price targets (mean, high, low)
   - Last updated timestamps

3. **Market Data**
   - Latest earnings reports
   - EPS actual vs estimates
   - Earnings surprises
   - Financial metrics (Market Cap, P/E, 52-week range)

4. **SEC Filings** (planned)
   - 10-K, 10-Q reports
   - 8-K material events
   - Form 4 insider trading

5. **Social Media Sentiment** (planned)
   - Twitter/X mentions
   - Reddit discussions
   - StockTwits sentiment

## How It Works

### 1. Query Processing
```
User Question → Ticker Detection → Multi-Source Search
```

### 2. Data Retrieval
- **Internal**: Vector similarity search in pgvector database
- **Public**: Parallel API calls to Finnhub, Yahoo Finance, etc.

### 3. Context Building
```
Internal Context (Portfolio Data)
+
Public Context (Market Data)
↓
Comprehensive Answer with Citations
```

### 4. Response Generation
- LLM synthesizes information from all sources
- Cites specific sources for each data point
- Provides actionable insights
- Notes timestamp/recency of information

## Example Queries

### Portfolio-Specific Questions
- "Why did we buy AAPL?"
  - **Internal**: Entry score, technical signals, rotation decision
  - **Public**: Latest analyst ratings, recent news, earnings

- "What's the risk on my TSLA position?"
  - **Internal**: Position size, entry price, unrealized P&L
  - **Public**: Volatility metrics, analyst concerns, recent events

### Market Research Questions
- "What's the latest news on NVDA?"
  - **Public**: Top 5 recent news articles with summaries and sources

- "Should I buy GOOGL?"
  - **Internal**: Current portfolio allocation, risk exposure
  - **Public**: Analyst consensus, price targets, earnings trends, news sentiment

### Strategy Questions
- "How does the scoring system work?"
  - **Internal**: Scoring formula, weights, component explanations
  - **Public**: N/A (internal strategy documentation)

## Response Format

```
Answer: [Comprehensive response synthesizing all sources]

Sources:
- [news - Bloomberg] NVDA Surges on AI Chip Demand (Feb 4, 2026)
- [analyst_report - Finnhub] NVDA Analyst Consensus: 85% Bullish
- [market_data - Company Earnings] NVDA Q4 2025 Earnings Beat
- [Internal] portfolio_data: Position in NVDA...
```

## Technical Implementation

### Architecture
```
ChatService
├── PgVectorStore (Internal RAG)
└── PublicSourcesSearchService
    ├── FinnhubService (News, Analysts, Earnings)
    ├── Yahoo Finance (Prices, Metrics)
    └── [Future] SEC EDGAR, NewsAPI, etc.
```

### Files
- [`src/services/chat-service.ts`](../src/services/chat-service.ts) - Enhanced chat with public sources
- [`src/services/public-sources-search.ts`](../src/services/public-sources-search.ts) - Public source search engine
- [`src/services/stock-data-ingestion.ts`](../src/services/stock-data-ingestion.ts) - Timeseries data storage

### API Endpoint
```
POST /api/chat
{
  "question": "What's happening with AAPL?",
  "ticker": "AAPL" // Optional, auto-detected from question
}

Response:
{
  "answer": "Based on recent data, AAPL...",
  "sources": [
    "[news - Reuters] Apple Announces...",
    "[analyst_report] 12 analysts, 75% bullish...",
    "[Internal] Position in AAPL..."
  ],
  "timestamp": "2026-02-04T22:48:35Z"
}
```

## Benefits

1. **Real-time Information**: Always uses latest market data
2. **Comprehensive Context**: Combines internal strategy with market reality
3. **Source Attribution**: Every claim is backed by cited sources
4. **Intelligent Synthesis**: LLM connects dots across multiple data sources
5. **Actionable Insights**: Provides context-aware recommendations

## Future Enhancements

- [ ] Web scraping for analyst reports from major banks
- [ ] SEC EDGAR API integration for filings
- [ ] Social media sentiment analysis (Twitter, Reddit)
- [ ] Real-time market data feeds (Level 2, order book)
- [ ] Earnings call transcripts analysis
- [ ] Technical chart pattern recognition
- [ ] Peer comparison and sector analysis

## Usage

The Portfolio Assistant is available in the dashboard at the bottom-right corner. Simply ask any question about:
- Your portfolio ("How's my portfolio doing?")
- Specific stocks ("What's the latest on TSLA?")
- Market trends ("What sectors are hot right now?")
- Strategy ("Why did we rotate out of META?")

The assistant will automatically search both internal data and public sources to give you the most comprehensive answer possible.
