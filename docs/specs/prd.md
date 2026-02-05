# Portfolio Rotation Agent — Product Requirements Document (Updated 2026)

## BMAD Summary

### Background
The Portfolio Rotation Agent is a production-ready, multi-user trading system that maximizes compounded portfolio returns through aggressive momentum-driven capital rotation while enforcing strict risk controls. The system features real-time data ingestion, RAG-powered AI assistance, and comprehensive market intelligence.

### Mission
- Aggressively capture momentum opportunities and reallocate capital when higher-expected-return candidates appear
- Provide intelligent, context-aware AI assistance powered by both internal portfolio data and real-time public market sources
- Produce auditable reasoning traces for every trade decision
- Deliver real-time market intelligence and comprehensive stock analysis
- Support multi-user deployments with secure authentication

### Approach
- Deterministic pipeline: Scanner → Risk Filter → Scorer → Comparator → Executor
- Score each security using the PRD formula (40% catalyst, 30% momentum, 20% upside, 10% timing)
- Rotate when candidate.score − holding.score > 0.02, executing highest-gain rotations first
- Continuous data ingestion from public sources (Finnhub, Yahoo Finance) every 15 minutes
- RAG-powered chat assistant with vector search for intelligent Q&A
- Real-time technical indicators (RSI, MACD, Bollinger Bands, Stochastic)

### Deliverables (Production)
- ✅ Working scoring engine and rotation engine with reasoning traces
- ✅ Portfolio model with P&L, stop-loss, and circuit-breaker enforcement
- ✅ Multi-user support with Clerk authentication
- ✅ Real-time data ingestion and timeseries storage
- ✅ RAG-powered AI assistant with public sources search
- ✅ Comprehensive backtesting engine
- ✅ React-based dashboard with real-time updates
- ✅ Technical indicators and chart analysis
- ✅ Politician trades tracking
- ✅ Unit and integration tests (coverage ≥ 85% on core modules)

---

## 1. Objective
Maximize portfolio return through disciplined, testable, and auditable aggressive rotation into the highest-momentum opportunities, supported by real-time market intelligence and AI-powered analysis.

---

## 2. Data Requirements & Architecture

### 2.1 Data Sources

#### Internal Data (PostgreSQL + pgvector)
- **Portfolio State**: Positions, trades, cash, P&L, risk metrics
- **User Data**: Multi-user profiles, watchlists, settings
- **Historical Data**: Trade history, performance snapshots
- **Vector Embeddings**: RAG database for AI chat context

#### External Data Sources (Real-time)
1. **Finnhub API**
   - Analyst recommendations (Strong Buy, Buy, Hold, Sell, Strong Sell)
   - Price targets (high, mean, low)
   - Company news with sentiment
   - Earnings reports (actual, estimate, surprise)
   - Financial metrics (Market Cap, P/E, 52-week range)

2. **Yahoo Finance**
   - Real-time price quotes
   - Historical price data (OHLCV)
   - Volume data

3. **Technical Indicators Service**
   - RSI (14-period)
   - MACD (12/26/9)
   - Bollinger Bands
   - Stochastic Oscillator

4. **Politician Trades Database**
   - Congressional stock transactions
   - Filing dates and disclosure links
   - Trade amounts and types

### 2.2 Timeseries Data Storage

**stock_data_snapshots** table:
```sql
CREATE TABLE stock_data_snapshots (
  ticker TEXT,
  timestamp TIMESTAMP,
  current_price REAL,
  price_change REAL,
  price_change_percent REAL,
  recommendations JSONB,  -- Analyst consensus
  price_target JSONB,     -- Target prices
  metrics JSONB,          -- Financial metrics
  technical_indicators JSONB,
  news JSONB,            -- Recent news array
  earnings JSONB,        -- Earnings history
  catalysts JSONB,       -- Identified catalysts
  sentiment REAL,        -- Market sentiment (-1 to 1)
  PRIMARY KEY (ticker, timestamp)
);
```

### 2.3 Data Ingestion Pipeline

**Continuous Ingestion**:
- Frequency: Every 15 minutes for top stocks
- Auto-ingests: AAPL, MSFT, GOOGL, AMZN, NVDA, TSLA, META, NFLX
- On-demand: Any ticker accessed by users
- Fallback: Direct API fetch if snapshot > 15 minutes old

**Data Flow**:
```
External APIs → Stock Data Ingestion Service → PostgreSQL (timeseries)
                                              → pgvector (embeddings)
                                              → Chat Service (RAG context)
```

### 2.4 Data Handling
- Cache responses with 15-minute TTL
- Automatic retry with exponential backoff
- Graceful degradation (skip unavailable tickers)
- Comprehensive logging for debugging

---

## 3. Signal Detection (Entry & Exit)

### Entry Signals (Bullish Catalysts) — weights shown
- Analyst upgrade with ≥15% target increase: 0.25
- Earnings surprise > +10%: 0.20
- RSI crossing above 50 from below: 0.15
- MACD bullish crossover: 0.15
- Volume surge > 2× 20-day average: 0.10
- News sentiment spike (>0.7): 0.10
- Sector rotation inflow: 0.05

Signals are normalized and summed to compute catalyst_strength in [0,1].

### Exit Signals
- Candidate in watchlist has higher score (rotation trigger)
- RSI > 75 (overbought)
- MACD bearish crossover
- Price target achieved
- 3 consecutive days of declining momentum
- Stop-loss triggered (-15%)

---

## 4. Scoring System

Expected return score (bounded 0..1):

```
expected_return_score =
  0.40 * catalyst_strength +
  0.30 * momentum_acceleration +
  0.20 * upside_potential +
  0.10 * timing_factor
```

**Components:**
- **catalyst_strength** ∈ [0,1]: Sum of triggered signal weights (clipped at 1)
- **momentum_acceleration** ∈ [-1,1]: Normalized RSI delta + MACD histogram delta
- **upside_potential** ∈ [0,1]: min(1.0, (analyst_target - current_price) / current_price)
- **timing_factor** ∈ [-0.5,0.5]: Discrete buckets based on RSI/MACD

**Timing Factor (Discrete)**:
- RSI 40–60 & MACD bullish: +0.5 (early entry)
- RSI 60–70 & MACD positive: +0.25 (momentum continuing)
- RSI 70–75: 0 (neutral)
- RSI >75 or MACD weakening: -0.5 (overbought)

---

## 5. Position Sizing

Kelly-inspired deterministic sizing:

```
position_size_pct = min(0.50 + (confidence × 0.40), 0.90)
```

where confidence = expected_return_score (0..1).

**Constraints:**
- Maximum allocation: 90% of portfolio
- Minimum cash reserve: $10
- Practical minimum: At least 1 share purchasable

---

## 6. Rotation Logic (Deterministic)

**Algorithm**:
```
FOR each holding H:
  FOR each candidate C not currently held:
    rotation_gain = C.score - H.score
    IF rotation_gain > rotation_threshold (0.02):
      enqueue rotation (H → C) with rotation_gain

Sort queued rotations by rotation_gain DESC
Execute in order until cash/constraints exhausted
```

**Parameters**:
- rotation_threshold = 0.02 (2% score differential)
- max_position_size_pct = 0.90
- cash_buffer = $10
- minimum_hold_period = 0 (configurable)

---

## 7. Processing Pipeline

```
WATCHLIST → SCANNER → RISK FILTER → SCORER → COMPARATOR → EXECUTOR → LOG
                                                                      ↓
                                                              RAG Database
```

Each stage emits structured outputs appended to `reasoning_trace`.

---

## 8. Risk Controls (Ruin Prevention)

- **Stop-loss per position**: -15% from entry (automatic exit)
- **Circuit breaker**: -30% max drawdown from peak (pauses all trading)
- **Minimum cash reserve**: $10
- **Earnings blackout**: 2 days before earnings (skip new entries)
- **Position size caps**: Maximum 90% per position

---

## 9. RAG-Powered AI Assistant

### 9.1 Architecture

```
User Question → Chat Service → [Internal RAG Search (pgvector)]
                             → [Public Sources Search (Finnhub, Yahoo)]
                             → [Context Synthesis]
                             → [LLM (Azure OpenAI GPT-4)]
                             → [Cited Answer + Sources]
```

### 9.2 Data Sources

**Internal Sources (pgvector)**:
- Portfolio performance metrics
- Active positions and P&L
- Trade history and rotation decisions
- Scoring algorithm and strategy rules
- Risk management parameters
- Technical indicators

**Public Sources (Real-time)**:
1. **Financial News**
   - Latest news from Bloomberg, Reuters, CNBC
   - Headlines, summaries, URLs
   - Timestamps for recency
   - Sentiment analysis

2. **Analyst Reports**
   - Current recommendations and consensus
   - Price targets (mean, high, low)
   - Rating changes and upgrades/downgrades
   - Analyst firm attribution

3. **Market Data**
   - Latest earnings reports
   - EPS actual vs estimates
   - Financial metrics (Market Cap, P/E, etc.)
   - 52-week ranges

4. **Technical Analysis**
   - Real-time RSI, MACD, Bollinger Bands
   - Volume analysis
   - Trend strength indicators

### 9.3 Context Building

**Multi-Source Synthesis**:
```
Internal Context (Portfolio Data)
+ Public Context (Market Intelligence)
→ Comprehensive Answer with Citations
```

### 9.4 Response Format

```
Answer: [Comprehensive response synthesizing all sources]

Sources:
- [news - Bloomberg] NVDA Surges on AI Chip Demand (Feb 4, 2026)
- [analyst_report - Finnhub] NVDA: 85% Bullish, $950 mean target
- [market_data - Company Earnings] Q4 2025 beat by 15%
- [Internal] portfolio_data: Current position in NVDA...
```

### 9.5 Example Capabilities

**Portfolio Questions**:
- "Why did we buy AAPL?"
- "What's the risk on my TSLA position?"
- "How is my portfolio performing?"

**Market Research**:
- "What's the latest news on NVDA?"
- "Should I buy GOOGL?"
- "What are analysts saying about META?"

**Strategy Questions**:
- "How does the scoring system work?"
- "Why did we rotate out of MSFT?"
- "What signals triggered the TSLA entry?"

### 9.6 Implementation Details

**Tech Stack**:
- **Vector Store**: pgvector with 1536-dimensional embeddings
- **LLM**: Azure OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-ada-002
- **Search**: Cosine similarity search in pgvector

**API Endpoint**:
```
POST /api/chat
{
  "question": "What's happening with AAPL?",
  "ticker": "AAPL" // Optional, auto-detected
}

Response:
{
  "answer": "Based on recent data, AAPL...",
  "sources": [
    "[news - Reuters] Apple announces...",
    "[analyst_report] 12 analysts, 75% bullish...",
    "[Internal] Position in AAPL: 10 shares..."
  ],
  "timestamp": "2026-02-04T22:48:35Z"
}
```

---

## 10. Multi-User Architecture

### 10.1 Authentication
- **Provider**: Clerk (JWT-based)
- **Middleware**: `@clerk/express` for route protection
- **Token**: Bearer token in Authorization header

### 10.2 User Isolation
```
User (Clerk ID) → User Service → User-Specific Agent
                               → User-Specific Portfolio
                               → User-Specific Watchlists
```

### 10.3 Database Schema
- `user_profiles`: User settings, initial capital
- `portfolios`: User-specific portfolio state
- `positions`: User-specific positions
- `trades`: User-specific trade history
- `watchlists`: User-specific watchlists

---

## 11. Frontend Architecture

### 11.1 Technology Stack
- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **State**: React hooks and context
- **UI**: Custom CSS with dark theme
- **Charts**: Lightweight Chart by TradingView
- **Auth**: Clerk React SDK

### 11.2 Key Pages

1. **Dashboard** (`/dashboard`)
   - Portfolio overview stats
   - Active positions table
   - Top scoring stocks
   - Recent rotations
   - Politician trades sidebar

2. **Stock Detail** (`/stock/:ticker`)
   - Real-time price and change
   - Analyst consensus and ratings
   - Price targets
   - Technical indicators with visualizations
   - Recent news with sentiment
   - Latest earnings data
   - Catalysts and price drivers
   - Congressional trades
   - Interactive price chart

3. **Backtesting** (`/backtest`)
   - Historical simulation configuration
   - Multiple strategy comparison
   - Performance metrics and charts
   - Trade-by-trade analysis

4. **Settings** (`/settings`)
   - Watchlist management
   - Risk parameters
   - User profile settings

### 11.3 Real-Time Features
- **Custom Ticker Tape**: Scrolling stock prices with internal navigation
- **Live Data Updates**: 15-minute refresh cycle
- **Portfolio Assistant**: Bottom-right chat widget
- **HMR**: Hot Module Replacement for development

---

## 12. State & Outputs

### Portfolio State (Serialized)
```typescript
{
  holdings: {
    ticker: {
      shares: number,
      avg_cost: number,
      current_price: number,
      entry_date: Date,
      entry_score: number
    }
  },
  cash: number,
  total_value: number,
  peak_value: number,
  user_id: string
}
```

### Analysis State
```typescript
{
  watchlist: string[],
  scores: Map<string, Score>,
  last_run: Date,
  user_id: string
}
```

### Execution Output (Trade Plan JSON)
```json
{
  "generated_at": "ISO8601",
  "objective": "MAXIMIZE_RETURN",
  "portfolio_value": 12345.67,
  "recommendation": "ROTATE",
  "rotation": {
    "sell": {
      "ticker": "MSFT",
      "shares": 2,
      "price": 420.0,
      "proceeds": 840.0,
      "current_score": 0.45
    },
    "buy": {
      "ticker": "SMCI",
      "shares": 3,
      "price": 275.0,
      "cost": 825.0,
      "expected_score": 0.82
    }
  },
  "score_improvement": 0.37,
  "position_size_pct": 0.82,
  "post_trade_cash": 15.0,
  "reasoning_trace": [
    {
      "stage": "SCANNER",
      "ticker": "SMCI",
      "notes": "Volume spike detected (3.2x average)",
      "timestamp": "..."
    }
  ]
}
```

---

## 13. Validation & Backtest Plan

### Backtest Datasets
- 2023–2024 full-market history (primary validation)
- 2018 correction period
- 2020 COVID drawdown
- 2019 sideways market

### Validation Metrics (Targets)
- **Annual Return**: > 50%
- **Sharpe Ratio**: > 1.5
- **Max Drawdown**: < 35%
- **Win Rate**: > 55%
- **Profit Factor**: > 2.0

### Testing Approach
- Unit tests for indicators and scoring
- Integration tests for rotation logic
- Reproducible backtest runs with deterministic fills
- Coverage target: ≥ 85% on core modules

---

## 14. Acceptance Criteria (Verified)

✅ **AC-1**: Scoring correctness validated through unit tests

✅ **AC-2**: Rotation threshold (0.02) enforced and tested

✅ **AC-3**: Position sizing follows Kelly-inspired formula

✅ **AC-4**: Risk controls (stop-loss, circuit breaker) enforced

✅ **AC-5**: Trade-plan JSON includes reasoning_trace

✅ **AC-6**: Backtest results tracked and reproducible

✅ **AC-7**: CLI commands operational (`analyze`, `trade`, `dashboard`)

✅ **AC-8**: Multi-user support with Clerk authentication

✅ **AC-9**: Real-time data ingestion every 15 minutes

✅ **AC-10**: RAG-powered chat with public sources search

✅ **AC-11**: Timeseries stock data storage and retrieval

✅ **AC-12**: Technical indicators calculated and displayed

✅ **AC-13**: React Router navigation between pages

✅ **AC-14**: Custom ticker tape with internal navigation

---

## 15. API Endpoints

### Portfolio Management
- `GET /api/portfolio` - Get portfolio state
- `GET /api/positions` - Get active positions
- `GET /api/trades` - Get trade history
- `POST /api/execute` - Run scanner and execute rotations

### Market Data
- `GET /api/scores` - Get watchlist scores
- `GET /api/market/:ticker` - Get comprehensive analysis
- `GET /api/market/:ticker/snapshot` - Get real-time timeseries snapshot
- `GET /api/market/:ticker/indicators` - Get technical indicators
- `GET /api/market/:ticker/chart` - Get historical price data
- `GET /api/market/:ticker/news` - Get latest news
- `GET /api/market/:ticker/earnings` - Get earnings data
- `GET /api/market/:ticker/politician-trades` - Get congressional trades
- `POST /api/market/:ticker/ingest` - Manually trigger data ingestion

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/watchlists` - Get user watchlists
- `POST /api/user/watchlists` - Save/update watchlist

### AI Chat
- `POST /api/chat` - Ask Portfolio Assistant a question
- `GET /api/chat/suggestions` - Get suggested questions

### Backtesting
- `POST /api/backtest` - Run backtest simulation
- `POST /api/backtest/compare` - Compare multiple strategies

---

## 16. Deployment Architecture

### Production Stack
- **Frontend**: React SPA (Vite build)
- **Backend**: Node.js + Express (TypeScript compiled)
- **Database**: Neon PostgreSQL with pgvector extension
- **Authentication**: Clerk
- **Hosting**: Azure Static Web Apps (frontend) + Azure App Service (backend)
- **APIs**: Finnhub (market data), Yahoo Finance (prices)
- **AI**: Azure OpenAI (GPT-4 + embeddings)

### Environment Variables
```
DATABASE_URL=postgresql://...
CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
FINNHUB_API_KEY=...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
AZURE_OPENAI_DEPLOYMENT_NAME=...
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=...
```

---

## 17. Performance Targets

### Response Times
- Portfolio data: < 500ms
- Stock analysis: < 2s
- AI chat response: < 3s
- Data ingestion: < 5s per ticker

### Scalability
- Support 1000+ concurrent users
- Handle 10,000+ stock tickers
- Store 1 year of historical snapshots
- Process 100+ chat queries per minute

### Reliability
- 99.9% uptime
- Automatic failover for external APIs
- Graceful degradation on API failures
- Comprehensive error logging

---

## 18. Security & Compliance

### Authentication & Authorization
- JWT-based authentication via Clerk
- User-specific data isolation
- Role-based access control (planned)

### Data Protection
- Encrypted connections (HTTPS/TLS)
- Secure database credentials (environment variables)
- No sensitive data in logs
- GDPR-compliant data handling

### API Security
- Rate limiting on endpoints
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection

---

## 19. Monitoring & Observability

### Logging
- Structured JSON logs
- Request/response tracing
- Error stack traces
- Performance metrics

### Metrics
- API response times
- Data ingestion success rates
- Chat query volume
- User activity patterns

### Alerts
- API failures
- Database connection issues
- High error rates
- Performance degradation

---

## 20. Future Enhancements

### Short-term (Next 3 Months)
- [ ] Real-time WebSocket updates for live prices
- [ ] Options trading support
- [ ] Portfolio optimization recommendations
- [ ] Mobile app (React Native)
- [ ] Email/SMS alerts for rotations

### Medium-term (6 Months)
- [ ] Machine learning-based scoring enhancements
- [ ] Social sentiment analysis (Twitter, Reddit)
- [ ] Automated tax loss harvesting
- [ ] Multi-portfolio support per user
- [ ] Integration with brokers (Alpaca, Interactive Brokers)

### Long-term (12+ Months)
- [ ] Cryptocurrency support
- [ ] International markets
- [ ] Custom strategy builder (no-code)
- [ ] Community-shared strategies
- [ ] Regulatory compliance automation

---

## 21. Success Metrics

### User Engagement
- Daily active users
- Average session duration
- Chat queries per user
- Watchlist creation rate

### Trading Performance
- Portfolio return vs S&P 500
- Sharpe ratio across all users
- Win rate percentage
- Average holding period

### System Health
- API uptime percentage
- Average response time
- Error rate < 0.1%
- Data freshness (< 15 minutes)

---

## Documentation

- **Technical Docs**: `/docs/`
- **API Reference**: `/docs/API.md`
- **Chat Integration**: `/docs/CHAT_PUBLIC_SOURCES.md`
- **Deployment Guide**: `/docs/DEPLOYMENT.md`
- **Architecture**: `/docs/ARCHITECTURE.md`

---

*Last Updated: February 4, 2026*
*Version: 2.0 (Production)*
