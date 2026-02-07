# Portfolio Rotation Agent — Product Requirements Document

*Version: 3.0 | Last Updated: February 6, 2026*

---

## 1. Problem Statement

Retail and semi-professional traders lack a systematic, auditable way to capture momentum-driven opportunities across equities. Most rely on gut instinct or scattered tools, leading to inconsistent returns, poor risk management, and no structured learning path. Meanwhile, new users face a steep onboarding cliff — they must risk real capital before understanding how the system's scoring, rotation, and risk controls actually work.

This problem affects active traders who want disciplined, algorithm-assisted portfolio rotation but cannot afford institutional-grade tooling. The cost of not solving it includes capital loss from emotional trading, missed rotation opportunities, and user churn from lack of confidence in the platform. User research and support data indicate that the top two reasons users abandon trading platforms are fear of loss during onboarding and lack of social proof that strategies work.

---

## 2. Goals

| # | Goal | Type | How We Measure Success |
|---|------|------|----------------------|
| G1 | Reduce time-to-first-trade by 60% through paper trading onboarding | User | Median days from signup to first real trade ≤ 3 days (from ~8 today) |
| G2 | Achieve 40% monthly active engagement on the gamification leaderboard | User | MAU interacting with leaderboard / total MAU ≥ 40% |
| G3 | Maximize portfolio return vs. S&P 500 through disciplined momentum rotation | User | Median user portfolio Sharpe ratio > 1.5 |
| G4 | Increase 30-day user retention by 25% via paper trading and social features | Business | D30 retention rate improves from baseline by ≥ 25% |
| G5 | Maintain platform reliability at 99.9% uptime with sub-2s response times | Business | P95 API latency < 2s; uptime ≥ 99.9% monthly |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|----------|--------|
| NG1 | Real-money brokerage integration (Alpaca, IBKR) | Separate initiative requiring SEC/FINRA compliance review; planned for v4 |
| NG2 | Cryptocurrency or international market support | Different data pipelines and regulatory requirements; premature for v3 |
| NG3 | Social trading (copy-trading other users' live portfolios) | Regulatory complexity around investment advice; leaderboard visibility is sufficient for v3 |
| NG4 | Mobile native app | React Native planned for v4; responsive web covers mobile use cases for now |
| NG5 | Custom no-code strategy builder | Too complex for this release; users can adjust watchlists and risk parameters instead |

---

## 4. User Stories

### Paper Trading

- **As a new user**, I want to start with a virtual portfolio when I sign up so that I can learn the platform's rotation strategy without risking real money.
- **As a new user**, I want to see my paper trades execute with real market data so that I understand how the scoring and rotation engine works in practice.
- **As a paper trader**, I want to receive the same AI assistant analysis on my paper portfolio so that I get the full experience before going live.
- **As a paper trader**, I want a clear indicator showing I'm in paper mode so that I never confuse simulated results with real performance.
- **As a paper trader**, I want to transition to live trading when I'm ready, preserving my watchlists and settings, so that the switch is seamless.
- **As an existing live trader**, I want to run a parallel paper portfolio to test strategy changes so that I can experiment without risking my live capital.

### Gamification & Leaderboard

- **As a competitive user**, I want to see a leaderboard of top-performing portfolios (both paper and live) so that I can benchmark my strategy against peers.
- **As a leaderboard participant**, I want to filter the leaderboard by time period (daily, weekly, monthly, all-time) so that I can see who's performing best across different horizons.
- **As a user**, I want to earn achievement badges (e.g., "First Rotation," "10-Trade Streak," "Beat the S&P") so that I stay motivated and engaged.
- **As a privacy-conscious user**, I want to control whether my portfolio appears on the leaderboard so that I can opt out if I prefer anonymity.
- **As a user viewing the leaderboard**, I want to see each leader's return %, Sharpe ratio, and win rate (but not their specific holdings) so that I can evaluate strategy quality without exposing proprietary positions.
- **As a user**, I want to see my own rank and percentile even if I'm not in the top tier so that I understand where I stand.

### Core Trading (Existing)

- **As a trader**, I want the system to continuously score my watchlist and rotate into higher-momentum candidates so that I don't miss opportunities.
- **As a trader**, I want every trade decision to include an auditable reasoning trace so that I can understand and trust the system's logic.
- **As a trader**, I want automatic stop-loss and circuit-breaker enforcement so that catastrophic losses are prevented.
- **As a user**, I want to ask the AI assistant about my portfolio, market conditions, and strategy rationale so that I get context-rich answers with cited sources.
- **As a user**, I want real-time technical indicators (RSI, MACD, Bollinger, Stochastic) and analyst consensus on any stock so that I have comprehensive analysis at my fingertips.
- **As a user**, I want to track politician/congressional trades so that I can factor insider-adjacent signals into my analysis.

---

## 5. Requirements

### Must-Have (P0)

#### 5.1 Paper Trading Engine

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| PT-1 | All new users start in paper trading mode with $100,000 virtual capital | Given a new user signs up, when their account is created, then a paper portfolio is initialized with $100K virtual cash and `mode=paper` flag |
| PT-2 | Paper trades execute against real-time market data using the same scoring/rotation engine as live | Given a paper portfolio, when the rotation engine runs, then it uses live Finnhub/Yahoo prices and the identical scoring formula |
| PT-3 | Paper portfolio tracks full P&L, positions, trade history, and reasoning traces | Given paper trades execute, when a user views their dashboard, then all metrics match the live dashboard format |
| PT-4 | Clear visual distinction between paper and live modes across all UI surfaces | Given a user is in paper mode, when they view any page, then a persistent "PAPER TRADING" banner/badge is visible and the color scheme differs subtly |
| PT-5 | Users can graduate from paper to live trading via an explicit opt-in action | Given a paper trader wants to go live, when they click "Go Live" in settings, then they confirm via a modal, their watchlists/settings carry over, and a new live portfolio is created |
| PT-6 | Users can maintain parallel paper and live portfolios | Given a live trader, when they create a paper portfolio from settings, then both portfolios run independently with separate state |

#### 5.2 Gamification & Leaderboard

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| LB-1 | Global leaderboard displaying top earners ranked by return % | Given any authenticated user, when they visit `/leaderboard`, then they see a ranked list of users by return % with Sharpe ratio and win rate columns |
| LB-2 | Leaderboard filterable by time period (daily, weekly, monthly, all-time) | Given the leaderboard page, when a user selects a time period, then rankings recalculate based on that window |
| LB-3 | Separate leaderboard tabs for paper and live portfolios | Given the leaderboard, when a user toggles between "Paper" and "Live" tabs, then only portfolios of that mode are shown |
| LB-4 | User privacy controls: opt-in/opt-out of leaderboard visibility | Given a user's settings page, when they toggle "Show on Leaderboard" off, then their portfolio is excluded from all public rankings |
| LB-5 | Display user's own rank and percentile regardless of leaderboard position | Given a user viewing the leaderboard, when the page loads, then a sticky card shows "Your Rank: #X of Y (Top Z%)" |

#### 5.3 Core Scoring & Rotation Engine (Existing — Verified)

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| SE-1 | Score each security: `0.40 * catalyst + 0.30 * momentum + 0.20 * upside + 0.10 * timing` | Unit tests validate scoring formula produces expected outputs for known inputs |
| SE-2 | Rotate when `candidate.score − holding.score > 0.02`, executing highest-gain rotations first | Integration tests confirm rotation threshold enforcement and priority ordering |
| SE-3 | Position sizing: `min(0.50 + (confidence × 0.40), 0.90)` with $10 cash reserve | Unit tests validate sizing constraints across edge cases |
| SE-4 | Stop-loss at −15% per position; circuit breaker at −30% max drawdown | Risk control tests verify automatic exit and trading pause triggers |
| SE-5 | Reasoning trace emitted at every pipeline stage (Scanner → Risk → Scorer → Comparator → Executor) | All trade plan JSONs include complete `reasoning_trace` array |

#### 5.4 Data Ingestion & Storage (Existing — Verified)

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| DI-1 | Continuous data ingestion every 15 minutes from Finnhub and Yahoo Finance | Cron job runs on schedule; `stock_data_snapshots` table receives new rows within TTL |
| DI-2 | Timeseries storage in PostgreSQL with `(ticker, timestamp)` primary key | Schema validated; queries by ticker and time range return correct results |
| DI-3 | Technical indicators (RSI, MACD, Bollinger, Stochastic) computed and stored | Indicator values match reference calculations within acceptable tolerance |
| DI-4 | On-demand ingestion for any ticker accessed by users with < 15-min staleness | When a user views a ticker with stale data, ingestion triggers automatically |

#### 5.5 RAG-Powered AI Assistant (Existing — Verified)

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| AI-1 | Multi-source synthesis: internal portfolio data + public market intelligence | Chat responses reference both internal positions and external news/analysts |
| AI-2 | Cited answers with source attribution | Every response includes a `sources` array with `[type - provider] Description` format |
| AI-3 | Works identically for paper and live portfolios | Given a paper trader asks "How is my portfolio doing?", the response reflects paper portfolio state |

#### 5.6 Multi-User Architecture (Existing — Verified)

| ID | Requirement | Acceptance Criteria |
|----|------------|-------------------|
| MU-1 | Clerk JWT authentication with user-specific data isolation | Each user sees only their own portfolios, trades, and watchlists |
| MU-2 | User profiles, watchlists, and settings stored per-user | Database schema enforces `user_id` foreign keys on all user-scoped tables |

### Nice-to-Have (P1)

| ID | Requirement | Notes |
|----|------------|-------|
| GM-1 | Achievement badges system (First Rotation, 10-Trade Streak, Beat the S&P, Risk Manager, etc.) | Visual badge gallery on user profile; push notification on earn |
| GM-2 | Weekly and monthly performance digests emailed to users | Summarize rank changes, top trades, badges earned |
| GM-3 | "Challenge a Friend" mode — two users compare returns over a defined period | Creates a head-to-head challenge with countdown and result |
| GM-4 | Leaderboard "Seasons" — quarterly resets with hall-of-fame archive | Encourages fresh competition; historical seasons viewable |
| GM-5 | Paper trading tutorials/guided walkthrough for new users | Step-by-step onboarding flow explaining scoring, rotation, and risk |
| GM-6 | Real-time WebSocket updates for live price tickers | Replaces 15-min polling with push-based updates |
| GM-7 | Email/SMS alerts for rotation events and stop-loss triggers | Configurable notification preferences per user |

### Future Considerations (P2)

| ID | Requirement | Architectural Notes |
|----|------------|-------------------|
| FT-1 | Brokerage integration (Alpaca, Interactive Brokers) for real execution | Design paper/live mode toggle to accommodate a third "connected broker" mode |
| FT-2 | Machine learning scoring enhancements | Scoring interface should be pluggable so ML models can replace or augment the deterministic formula |
| FT-3 | Social sentiment analysis (Twitter/X, Reddit) | Data ingestion pipeline should support adding new source adapters |
| FT-4 | Community-shared strategies and strategy marketplace | Leaderboard user profiles should eventually link to strategy descriptions |
| FT-5 | Mobile native app (React Native) | Frontend already uses React; component library should be cross-platform compatible |
| FT-6 | Cryptocurrency and international markets | Ticker schema and data pipeline should not assume US equities only |
| FT-7 | Automated tax-loss harvesting | Trade execution engine should log tax lot information from v3 onward |
| FT-8 | Options trading support | Position model should support instrument types beyond equities |

---

## 6. Technical Architecture

### 6.1 Production Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, React Router v6, TradingView Lightweight Charts |
| Backend | Node.js + Express (TypeScript) |
| Database | Neon PostgreSQL + pgvector |
| Authentication | Clerk (JWT) |
| AI/LLM | Azure OpenAI GPT-4 + text-embedding-ada-002 |
| External Data | Finnhub API, Yahoo Finance |
| Hosting | Azure Static Web Apps (frontend) + Azure App Service (backend) |

### 6.2 Database Schema Additions (v3)

```sql
-- Paper trading support
ALTER TABLE portfolios ADD COLUMN mode TEXT DEFAULT 'paper' CHECK (mode IN ('paper', 'live'));
ALTER TABLE portfolios ADD COLUMN virtual_capital REAL DEFAULT 100000;

-- Leaderboard
CREATE TABLE leaderboard_snapshots (
  user_id TEXT NOT NULL,
  portfolio_id INTEGER NOT NULL,
  mode TEXT NOT NULL, -- 'paper' or 'live'
  period TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  return_pct REAL,
  sharpe_ratio REAL,
  win_rate REAL,
  total_trades INTEGER,
  rank INTEGER,
  percentile REAL,
  snapshot_date DATE,
  PRIMARY KEY (user_id, portfolio_id, period, snapshot_date)
);

-- Gamification
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria JSONB -- machine-readable unlock conditions
);

CREATE TABLE user_achievements (
  user_id TEXT NOT NULL,
  achievement_id INTEGER REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Privacy
ALTER TABLE user_profiles ADD COLUMN leaderboard_visible BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN display_name TEXT;
```

### 6.3 New API Endpoints (v3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/portfolio/paper` | Create a new paper portfolio |
| POST | `/api/portfolio/go-live` | Graduate from paper to live trading |
| GET | `/api/leaderboard` | Get leaderboard (query params: `mode`, `period`, `page`) |
| GET | `/api/leaderboard/me` | Get current user's rank and percentile |
| PUT | `/api/user/profile/visibility` | Toggle leaderboard visibility |
| GET | `/api/achievements` | List all available achievements |
| GET | `/api/achievements/me` | Get current user's earned achievements |

### 6.4 Existing API Endpoints (Unchanged)

**Portfolio Management**: `GET /api/portfolio`, `GET /api/positions`, `GET /api/trades`, `POST /api/execute`

**Market Data**: `GET /api/scores`, `GET /api/market/:ticker`, `GET /api/market/:ticker/snapshot`, `GET /api/market/:ticker/indicators`, `GET /api/market/:ticker/chart`, `GET /api/market/:ticker/news`, `GET /api/market/:ticker/earnings`, `GET /api/market/:ticker/politician-trades`, `POST /api/market/:ticker/ingest`

**User Management**: `GET /api/user/profile`, `PUT /api/user/profile`, `GET /api/user/watchlists`, `POST /api/user/watchlists`

**AI Chat**: `POST /api/chat`, `GET /api/chat/suggestions`

**Backtesting**: `POST /api/backtest`, `POST /api/backtest/compare`

### 6.5 Frontend Pages (v3 Additions)

| Page | Route | Description |
|------|-------|-------------|
| Leaderboard | `/leaderboard` | Ranked table with period filters, paper/live tabs, user rank card |
| Achievements | `/achievements` | Badge gallery showing earned and locked achievements |
| Paper Trading Dashboard | `/dashboard` (paper mode) | Same layout as live dashboard with paper mode banner |
| Go-Live Flow | `/settings/go-live` | Confirmation modal and transition wizard |

### 6.6 Processing Pipeline

```
WATCHLIST → SCANNER → RISK FILTER → SCORER → COMPARATOR → EXECUTOR → LOG
                                                                       ↓
                                                               RAG Database
                                                                       ↓
                                                            Leaderboard Snapshot
                                                            (nightly aggregation)
```

### 6.7 Signal Detection

**Entry Signals** (weights): Analyst upgrade ≥15% target increase (0.25), Earnings surprise >+10% (0.20), RSI crossing above 50 (0.15), MACD bullish crossover (0.15), Volume surge >2× average (0.10), News sentiment spike >0.7 (0.10), Sector rotation inflow (0.05).

**Exit Signals**: Higher-scoring candidate available (rotation trigger), RSI > 75, MACD bearish crossover, Price target achieved, 3 consecutive declining momentum days, Stop-loss at −15%.

### 6.8 Scoring Formula

```
expected_return_score =
  0.40 * catalyst_strength +     // [0,1] sum of triggered signal weights
  0.30 * momentum_acceleration + // [-1,1] RSI delta + MACD histogram delta
  0.20 * upside_potential +      // [0,1] (analyst_target - price) / price
  0.10 * timing_factor           // [-0.5,0.5] discrete RSI/MACD buckets
```

### 6.9 Risk Controls

Stop-loss per position at −15%, circuit breaker at −30% max drawdown, $10 minimum cash reserve, 2-day earnings blackout, 90% maximum position size. All risk controls apply identically to paper and live portfolios.

---

## 7. Success Metrics

### Leading Indicators (Days to Weeks Post-Launch)

| Metric | Target | Stretch | Measurement |
|--------|--------|---------|-------------|
| Paper trading adoption (new users) | 80% of signups start paper trading | 95% | Clerk signup → paper portfolio creation events |
| Paper-to-live graduation rate | 30% within 14 days | 50% | `go-live` events / paper portfolio creations |
| Leaderboard page views / MAU | 40% of MAU visit leaderboard weekly | 60% | Page view analytics on `/leaderboard` |
| Achievement unlock rate | Avg user earns 3+ badges in first month | 5+ | `user_achievements` table aggregation |
| AI chat queries per user (paper) | ≥ 5 queries in first week | ≥ 10 | Chat API logs filtered by paper portfolios |
| Task completion: first rotation | 90% of paper users complete first rotation within 48h | 95% | Trade history for paper portfolios |

### Lagging Indicators (Weeks to Months)

| Metric | Target | Stretch | Measurement |
|--------|--------|---------|-------------|
| D30 retention | +25% vs. pre-v3 baseline | +40% | Cohort analysis in analytics platform |
| Monthly active users | 2× current MAU within 6 months | 3× | Clerk active sessions |
| Median portfolio Sharpe ratio (live) | > 1.5 | > 2.0 | Nightly leaderboard aggregation |
| Portfolio return vs. S&P 500 | > 50% annualized (median) | > 75% | Backtesting validation + live tracking |
| NPS score | > 50 | > 70 | Quarterly user survey |
| Support ticket volume | −20% (rotation/strategy questions deflected to AI chat) | −40% | Support system analytics |

### System Health

| Metric | Target |
|--------|--------|
| API uptime | ≥ 99.9% monthly |
| P95 API latency | < 2s (portfolio), < 3s (chat), < 5s (ingestion) |
| Error rate | < 0.1% |
| Data freshness | < 15 minutes for all tracked tickers |
| Leaderboard computation | Nightly batch completes < 10 minutes |

---

## 8. Open Questions

| # | Question | Owner | Blocking? |
|---|----------|-------|-----------|
| Q1 | Should paper trading default capital be $100K or configurable per user? | Product | No — start with $100K, parameterize later |
| Q2 | Do we need legal disclaimers on the leaderboard ("past performance is not indicative...")? | Legal | Yes — resolve before leaderboard ships |
| Q3 | Should leaderboard rankings use risk-adjusted return (Sharpe) or raw return % as primary sort? | Product + Data | No — ship with return %, add Sharpe sort as toggle |
| Q4 | How do we prevent leaderboard gaming (e.g., creating multiple accounts, extreme leverage in paper mode)? | Engineering | Yes — define anti-gaming rules before launch |
| Q5 | Should achievements be visible to other users or private by default? | Product + Design | No — default visible, allow hiding in settings |
| Q6 | What is the minimum number of trades before a portfolio appears on the leaderboard? | Product | No — propose 5-trade minimum |
| Q7 | Should paper and live portfolios use separate or unified leaderboard rankings? | Product | No — separate tabs, as specified in LB-3 |

---

## 9. Timeline Considerations

**Hard Dependencies**: Legal review of leaderboard disclaimers must complete before leaderboard feature goes live. Clerk multi-portfolio support must be validated for parallel paper/live accounts.

**Suggested Phasing**:

- **Phase 1 (Weeks 1–3)**: Paper trading engine (PT-1 through PT-6), database migrations, backend APIs
- **Phase 2 (Weeks 3–5)**: Leaderboard backend (LB-1 through LB-5), nightly aggregation jobs, privacy controls
- **Phase 3 (Weeks 5–7)**: Frontend — leaderboard page, paper mode UI, go-live flow, achievement gallery
- **Phase 4 (Week 8)**: Integration testing, performance testing, legal review signoff, staged rollout

**Risks**: Leaderboard computation at scale (1000+ users) may require query optimization or materialized views. Paper trading parallel execution doubles the load on the scoring engine — monitor and scale accordingly.

---

## 10. Validation & Backtest Plan

### Backtest Datasets

2023–2024 full-market history (primary), 2018 correction period, 2020 COVID drawdown, 2019 sideways market.

### Validation Targets

Annual return > 50%, Sharpe ratio > 1.5, max drawdown < 35%, win rate > 55%, profit factor > 2.0.

### Testing Approach

Unit tests for indicators and scoring, integration tests for rotation logic, reproducible backtest runs with deterministic fills, coverage target ≥ 85% on core modules. Paper trading engine requires equivalent test coverage.

---

## 11. Security & Compliance

**Authentication**: Clerk JWT with user-specific data isolation and role-based access control (planned). **Data protection**: HTTPS/TLS, encrypted database credentials, GDPR-compliant handling, no sensitive data in logs. **API security**: Rate limiting, input validation, parameterized queries (SQL injection prevention), XSS protection. **Leaderboard-specific**: Display names only (no emails/real names unless opted in); portfolio details limited to aggregate metrics (no specific holdings exposed).

---

## 12. Monitoring & Observability

**Logging**: Structured JSON logs, request/response tracing, error stack traces, performance metrics. **Metrics**: API response times, data ingestion success rates, chat query volume, user activity patterns, leaderboard computation duration. **Alerts**: API failures, database connection issues, high error rates, performance degradation, leaderboard batch job failures.

---

## Appendix A: Acceptance Criteria (Existing — Verified)

- ✅ AC-1: Scoring correctness validated through unit tests
- ✅ AC-2: Rotation threshold (0.02) enforced and tested
- ✅ AC-3: Position sizing follows Kelly-inspired formula
- ✅ AC-4: Risk controls (stop-loss, circuit breaker) enforced
- ✅ AC-5: Trade-plan JSON includes reasoning_trace
- ✅ AC-6: Backtest results tracked and reproducible
- ✅ AC-7: CLI commands operational (analyze, trade, dashboard)
- ✅ AC-8: Multi-user support with Clerk authentication
- ✅ AC-9: Real-time data ingestion every 15 minutes
- ✅ AC-10: RAG-powered chat with public sources search
- ✅ AC-11: Timeseries stock data storage and retrieval
- ✅ AC-12: Technical indicators calculated and displayed
- ✅ AC-13: React Router navigation between pages
- ✅ AC-14: Custom ticker tape with internal navigation

## Appendix B: Documentation References

Technical Docs: `/docs/`, API Reference: `/docs/API.md`, Chat Integration: `/docs/CHAT_PUBLIC_SOURCES.md`, Deployment Guide: `/docs/DEPLOYMENT.md`, Architecture: `/docs/ARCHITECTURE.md`
