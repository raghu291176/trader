# End-to-End Testing Plan — Portfolio Rotation Agent

> Zero mock data. Every test hits live services: Neon PostgreSQL, Finnhub API, Yahoo Finance, Azure OpenAI, Clerk Auth, housestockwatcher.com, senatestockwatcher.com.

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Authentication Tests](#2-authentication-tests)
3. [User Profile & Settings Tests](#3-user-profile--settings-tests)
4. [Watchlist Management Tests](#4-watchlist-management-tests)
5. [Portfolio Management Tests](#5-portfolio-management-tests)
6. [Scoring & Analysis Engine Tests](#6-scoring--analysis-engine-tests)
7. [Trade Execution Tests](#7-trade-execution-tests)
8. [Market Data — Finnhub API Tests](#8-market-data--finnhub-api-tests)
9. [Market Data — Yahoo Finance Tests](#9-market-data--yahoo-finance-tests)
10. [Technical Indicators Tests](#10-technical-indicators-tests)
11. [Stock Data Ingestion & Timeseries Tests](#11-stock-data-ingestion--timeseries-tests)
12. [Politician Trades Tests](#12-politician-trades-tests)
13. [RAG Chat Assistant Tests](#13-rag-chat-assistant-tests)
14. [Backtesting Engine Tests](#14-backtesting-engine-tests)
15. [Paper Trading Tests](#15-paper-trading-tests)
16. [Go-Live Transition Tests](#16-go-live-transition-tests)
17. [Leaderboard Tests](#17-leaderboard-tests)
18. [Achievements Tests](#18-achievements-tests)
19. [Visibility & Privacy Tests](#19-visibility--privacy-tests)
20. [Frontend Route & Navigation Tests](#20-frontend-route--navigation-tests)
21. [Frontend Component Integration Tests](#21-frontend-component-integration-tests)
22. [Risk Controls Tests](#22-risk-controls-tests)
23. [Error Handling & Graceful Degradation Tests](#23-error-handling--graceful-degradation-tests)
24. [Performance & Response Time Tests](#24-performance--response-time-tests)
25. [Database Integrity Tests](#25-database-integrity-tests)
26. [Security Tests](#26-security-tests)

---

## 1. Test Environment Setup

### Required Environment Variables

All tests require the following environment variables pointing to **live services** (no mocks):

```
DATABASE_URL=<Neon PostgreSQL connection string>
CLERK_PUBLISHABLE_KEY=<Clerk publishable key>
CLERK_SECRET_KEY=<Clerk secret key>
FINNHUB_API_KEY=<Finnhub API key>
AZURE_OPENAI_API_KEY=<Azure OpenAI key>
AZURE_OPENAI_ENDPOINT=<Azure OpenAI endpoint>
AZURE_OPENAI_DEPLOYMENT_NAME=<GPT-4 deployment>
AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=<Embedding model deployment>
AZURE_OPENAI_API_VERSION=<API version, e.g. 2024-02-15-preview>
```

### Test Database

- Use a **dedicated test schema** (`trader_test`) or a **Neon branch** to isolate test data from production.
- Before each test suite run, truncate all tables in the test schema.
- After each test suite run, verify no orphan data remains.

### Test User

- Create a dedicated Clerk test user for E2E tests.
- Obtain a valid JWT token using the Clerk Backend API (`POST /v1/testing_tokens` or via the Clerk test user login flow).
- All authenticated requests use this token in the `Authorization: Bearer <token>` header.

### Server Startup

```bash
# Start backend in test mode
DATABASE_URL=$TEST_DATABASE_URL npm run server

# Start frontend dev server
cd frontend && npm run dev
```

### Rate Limiting Awareness

- Finnhub free tier: 60 calls/minute. Space tests accordingly.
- Yahoo Finance: Unofficial API, no guaranteed rate limits. Add 100ms delays between calls.
- Azure OpenAI: Respect RPM/TPM limits on the deployment.
- housestockwatcher.com / senatestockwatcher.com: Public APIs, add 500ms delays between calls.

---

## 2. Authentication Tests

### 2.1 Unauthenticated Access Blocked

| ID | Test | Method | Endpoint | Expected |
|----|------|--------|----------|----------|
| AUTH-01 | No token → 401 | GET | `/api/portfolio` | 401 Unauthorized |
| AUTH-02 | No token → 401 | GET | `/api/positions` | 401 Unauthorized |
| AUTH-03 | No token → 401 | GET | `/api/scores` | 401 Unauthorized |
| AUTH-04 | No token → 401 | POST | `/api/execute` | 401 Unauthorized |
| AUTH-05 | No token → 401 | GET | `/api/user/profile` | 401 Unauthorized |
| AUTH-06 | No token → 401 | GET | `/api/user/watchlists` | 401 Unauthorized |
| AUTH-07 | No token → 401 | POST | `/api/chat` | 401 Unauthorized |
| AUTH-08 | No token → 401 | POST | `/api/backtest` | 401 Unauthorized |
| AUTH-09 | No token → 401 | GET | `/api/market/AAPL` | 401 Unauthorized |
| AUTH-10 | No token → 401 | GET | `/api/leaderboard` | 401 Unauthorized |
| AUTH-11 | No token → 401 | GET | `/api/achievements/me` | 401 Unauthorized |
| AUTH-12 | No token → 401 | GET | `/api/portfolio/mode` | 401 Unauthorized |

### 2.2 Invalid Token Rejected

| ID | Test | Expected |
|----|------|----------|
| AUTH-13 | Expired JWT token → 401 | 401 Unauthorized |
| AUTH-14 | Malformed JWT → 401 | 401 Unauthorized |
| AUTH-15 | JWT from different Clerk instance → 401 | 401 Unauthorized |

### 2.3 Health Endpoint Public

| ID | Test | Method | Endpoint | Expected |
|----|------|--------|----------|----------|
| AUTH-16 | Health check no auth | GET | `/health` | 200, `{ status: 'healthy', timestamp: ... }` |

### 2.4 Valid Token Succeeds

| ID | Test | Expected |
|----|------|----------|
| AUTH-17 | Valid Clerk JWT → 200 | GET `/api/portfolio` returns portfolio data |
| AUTH-18 | User ID extracted correctly | `getUserId(req)` returns the Clerk user ID from token |

---

## 3. User Profile & Settings Tests

### 3.1 Read Profile

| ID | Test | Method | Endpoint | Expected |
|----|------|--------|----------|----------|
| PROF-01 | Get profile (new user) | GET | `/api/user/profile` | 200, `{ user_id, initial_capital: 10000, settings: {} }` |
| PROF-02 | Profile fields present | GET | `/api/user/profile` | Response has `user_id`, `initial_capital`, `settings` |

### 3.2 Create/Update Profile

| ID | Test | Expected |
|----|------|----------|
| PROF-03 | Set full name | PUT `/api/user/profile` with `{ full_name: "Test User" }` → 200. GET profile returns `full_name: "Test User"` |
| PROF-04 | Set email | PUT with `{ email: "test@example.com" }` → persisted in DB |
| PROF-05 | Set initial capital | PUT with `{ initial_capital: 50000 }` → persisted, GET returns 50000 |
| PROF-06 | Set risk settings | PUT with `{ settings: { stopLossPercent: 10, circuitBreakerPercent: 20, cashReservePercent: 15 } }` → persisted |
| PROF-07 | Partial update preserves other fields | PUT only `{ full_name }`, email unchanged |

### 3.3 Database Verification

| ID | Test | Expected |
|----|------|----------|
| PROF-08 | Row exists in `trader.users` | SQL: `SELECT * FROM trader.users WHERE user_id = $1` returns 1 row |
| PROF-09 | Settings stored as JSONB | `settings` column is valid JSONB with correct keys |
| PROF-10 | `last_login` updated | Timestamp recent (within 5 seconds of request) |

---

## 4. Watchlist Management Tests

### 4.1 CRUD Operations

| ID | Test | Expected |
|----|------|----------|
| WL-01 | Create watchlist | POST `/api/user/watchlists` with `{ name: "test", tickers: ["AAPL", "MSFT"] }` → 200 |
| WL-02 | Read watchlists | GET `/api/user/watchlists` → array containing the created watchlist |
| WL-03 | Watchlist has correct tickers | Response entry has `tickers: ["AAPL", "MSFT"]` |
| WL-04 | Update watchlist (upsert) | POST same name with `["GOOGL", "AMZN"]` → overwrites previous tickers |
| WL-05 | Multiple watchlists | Create "tech" and "energy" watchlists, GET returns both |

### 4.2 Validation

| ID | Test | Expected |
|----|------|----------|
| WL-06 | Missing name → 400 | POST `{ tickers: ["AAPL"] }` → 400 |
| WL-07 | Missing tickers → 400 | POST `{ name: "test" }` → 400 |
| WL-08 | Non-array tickers → 400 | POST `{ name: "test", tickers: "AAPL" }` → 400 |

### 4.3 Database Verification

| ID | Test | Expected |
|----|------|----------|
| WL-09 | Row in `trader.watchlists` | SQL confirms row with correct `user_id`, `name`, `tickers` array |
| WL-10 | User isolation | User B cannot see User A's watchlists |

---

## 5. Portfolio Management Tests

### 5.1 Portfolio State

| ID | Test | Expected |
|----|------|----------|
| PORT-01 | Get portfolio overview | GET `/api/portfolio` → 200 with `{ totalValue, cash, unrealizedPnL, unrealizedPnLPercent, maxDrawdown, positionCount }` |
| PORT-02 | All numeric fields present | `totalValue` >= 0, `cash` >= 0, `positionCount` >= 0 |
| PORT-03 | `totalValue` = cash + sum(position values) | Mathematical correctness |

### 5.2 Positions

| ID | Test | Expected |
|----|------|----------|
| PORT-04 | Get positions (empty) | GET `/api/positions` → 200, empty array for new user |
| PORT-05 | Position fields after buy | After buying AAPL, response has `ticker`, `shares`, `entryPrice`, `currentPrice`, `entryScore`, `unrealizedPnL`, `unrealizedPnLPercent`, `value`, `entryTimestamp` |
| PORT-06 | `unrealizedPnL` = (currentPrice - entryPrice) * shares | Mathematical correctness |
| PORT-07 | `value` = currentPrice * shares | Mathematical correctness |

### 5.3 Trade History

| ID | Test | Expected |
|----|------|----------|
| PORT-08 | Get trades (empty) | GET `/api/trades` → 200, empty array for new user |
| PORT-09 | Trade recorded after execution | After buy, GET `/api/trades` contains the buy trade |
| PORT-10 | Trade fields | Each trade has `type`, `ticker`, `shares`, `price`, `timestamp` |

---

## 6. Scoring & Analysis Engine Tests

### 6.1 Watchlist Scoring

| ID | Test | Expected |
|----|------|----------|
| SCORE-01 | Get scores | GET `/api/scores` → 200, array of score objects |
| SCORE-02 | Score has required fields | Each entry: `ticker`, `score`, `components`, `currentPrice`, `priceChange`, `priceChangePercent` |
| SCORE-03 | Score bounded [0, 1] | All scores between 0 and 1 |
| SCORE-04 | `currentPrice` > 0 | Real prices from Yahoo Finance, not zero |
| SCORE-05 | Top 25 stocks included | At least AAPL, MSFT, GOOGL, NVDA present in scores |
| SCORE-06 | Custom watchlist tickers included | After saving watchlist with "AMD", "PLTR", those tickers appear in scores |

### 6.2 Scoring Formula Verification (PRD Section 4)

| ID | Test | Expected |
|----|------|----------|
| SCORE-07 | Formula: 40% catalyst + 30% momentum + 20% upside + 10% timing | Components sum matches total score within rounding |
| SCORE-08 | `catalyst_strength` ∈ [0, 1] | Component value clamped |
| SCORE-09 | `momentum_acceleration` ∈ [-1, 1] | Component value in range |
| SCORE-10 | `upside_potential` ∈ [0, 1] | min(1.0, (target - current) / current) |
| SCORE-11 | `timing_factor` ∈ [-0.5, 0.5] | Discrete buckets based on RSI/MACD |

### 6.3 Analyze Endpoint

| ID | Test | Expected |
|----|------|----------|
| SCORE-12 | POST `/api/analyze` with custom watchlist | Returns scores and rotationDecisions |
| SCORE-13 | `rotationDecisions` format | Array of sell/buy pairs with rotation_gain |

---

## 7. Trade Execution Tests

### 7.1 Explicit Buy/Sell

| ID | Test | Expected |
|----|------|----------|
| TRADE-01 | Buy stock | POST `/api/execute` `{ ticker: "AAPL", side: "buy", shares: 5 }` → 200 with `{ success: true, trade, message }` |
| TRADE-02 | Sell stock | After buying, POST `{ ticker: "AAPL", side: "sell", shares: 5 }` → 200 |
| TRADE-03 | Buy reduces cash | Portfolio cash decreases by approximately `shares * price` |
| TRADE-04 | Sell increases cash | Portfolio cash increases by approximately `shares * price` |
| TRADE-05 | Position created after buy | `/api/positions` shows AAPL position with correct shares |
| TRADE-06 | Position removed after full sell | Position no longer in list |
| TRADE-07 | Partial sell | Buy 10 shares, sell 5 → position shows 5 remaining |
| TRADE-08 | Trade recorded in history | `/api/trades` shows the BUY/SELL entry |

### 7.2 Auto-Rotation

| ID | Test | Expected |
|----|------|----------|
| TRADE-09 | Run rotation (no explicit trade) | POST `/api/execute` `{}` → runs analyzer + executor |
| TRADE-10 | Rotation response | Returns `{ portfolio, trades }` with updated values |
| TRADE-11 | Rotation threshold respected | Trades only occur when score differential > 0.02 |

### 7.3 Trade Validation

| ID | Test | Expected |
|----|------|----------|
| TRADE-12 | Buy with insufficient cash | Expect meaningful error message |
| TRADE-13 | Sell more shares than held | Expect error |
| TRADE-14 | Sell stock not held | Expect error |
| TRADE-15 | Buy 0 shares | Expect error |

---

## 8. Market Data — Finnhub API Tests

> All tests hit the live Finnhub API. Respect 60 calls/minute rate limit.

### 8.1 Ticker Analysis

| ID | Test | Expected |
|----|------|----------|
| FH-01 | GET `/api/market/AAPL` | 200, returns `{ recommendations, priceTarget, news, earnings, sentiment, metrics, monthlyHigh, catalysts }` |
| FH-02 | `recommendations` is array | At least 1 recommendation entry |
| FH-03 | Recommendation fields | Entry has `buy`, `hold`, `sell`, `strongBuy`, `strongSell`, `period`, `symbol` |
| FH-04 | `priceTarget` present | Has `targetHigh`, `targetLow`, `targetMean`, `targetMedian` |
| FH-05 | `news` array | At least 1 news item with `headline`, `source`, `summary`, `url`, `datetime` |
| FH-06 | `earnings` array | At least 1 entry with `actual`, `estimate`, `surprise`, `surprisePercent` |
| FH-07 | `sentiment` in range | Number between -1 and 1 |
| FH-08 | `metrics` present | Has `52WeekHigh`, `52WeekLow`, `marketCapitalization` |
| FH-09 | `monthlyHigh` | Has `price` > 0 and `date` string |
| FH-10 | `catalysts` array | Array of objects with `type`, `description`, `impact` |

### 8.2 Individual Endpoints

| ID | Test | Expected |
|----|------|----------|
| FH-11 | GET `/api/market/MSFT/recommendations` | Array of recommendation objects |
| FH-12 | GET `/api/market/GOOGL/price-target` | Object with target prices |
| FH-13 | GET `/api/market/NVDA/news` | Array of news items |
| FH-14 | GET `/api/market/TSLA/earnings` | Array of earnings entries |

### 8.3 Error Handling

| ID | Test | Expected |
|----|------|----------|
| FH-15 | Invalid ticker `ZZZZZ` | 200 with empty arrays/null (graceful degradation, not 500) |
| FH-16 | Verify no API key in response | Response body never contains the Finnhub API key |

---

## 9. Market Data — Yahoo Finance Tests

> Tests hit live Yahoo Finance via the `yahoo-finance2` npm package.

### 9.1 Price Data

| ID | Test | Expected |
|----|------|----------|
| YF-01 | Fetch candles for AAPL (30 days) | Returns `CandleData` with `prices`, `volumes`, `dates` arrays |
| YF-02 | `prices` array length | Approximately 20–22 entries (trading days in 30 calendar days) |
| YF-03 | All prices > 0 | No zero or negative prices |
| YF-04 | All volumes > 0 | Positive volume for each day |
| YF-05 | Dates are chronological | Each date > previous date |
| YF-06 | Current price reasonable | AAPL price between $50 and $500 (sanity check) |

### 9.2 Chart Endpoint

| ID | Test | Expected |
|----|------|----------|
| YF-07 | GET `/api/market/AAPL/chart?timeframe=1D` | Array of candle objects |
| YF-08 | GET `/api/market/AAPL/chart?timeframe=1W` | ~5 candles |
| YF-09 | GET `/api/market/AAPL/chart?timeframe=1M` | ~20 candles |
| YF-10 | GET `/api/market/AAPL/chart?timeframe=3M` | ~60 candles |
| YF-11 | GET `/api/market/AAPL/chart?timeframe=1Y` | ~250 candles |
| YF-12 | Candle fields | Each entry has `timestamp`, `open`, `high`, `low`, `close`, `volume` |
| YF-13 | `timestamp` is Unix ms | Positive integer, converts to valid date |

### 9.3 Caching

| ID | Test | Expected |
|----|------|----------|
| YF-14 | Second request uses cache | Two consecutive calls, second returns faster (< 10ms) |
| YF-15 | Cache expires after 1 hour | After manual cache clear, fresh data fetched |

---

## 10. Technical Indicators Tests

### 10.1 Indicators Endpoint

| ID | Test | Expected |
|----|------|----------|
| TI-01 | GET `/api/market/AAPL/indicators` | 200, JSON object |
| TI-02 | RSI present | `rsi` object with `value` (number 0–100) and `signal` (string) |
| TI-03 | RSI range | `rsi.value` between 0 and 100 |
| TI-04 | MACD present | `macd` object with `macd`, `signal`, `histogram`, `trend` |
| TI-05 | Bollinger Bands present | `bollinger` with `upper`, `middle`, `lower`, `percentB` |
| TI-06 | `upper` > `middle` > `lower` | Mathematical constraint |
| TI-07 | Stochastic present | `stochastic` with `k`, `d`, `signal` |
| TI-08 | Stochastic range | `k` and `d` between 0 and 100 |
| TI-09 | Trend and strength | `trend` is string ("bullish"/"bearish"/"neutral"), `strength` is number |

### 10.2 Calculation Verification

| ID | Test | Expected |
|----|------|----------|
| TI-10 | RSI uses 14-period | Calculation on 100 days of data with 14-period lookback |
| TI-11 | MACD uses 12/26/9 | Standard MACD parameters |
| TI-12 | Bollinger uses 20-period, 2 std dev | Standard Bollinger parameters |

---

## 11. Stock Data Ingestion & Timeseries Tests

### 11.1 Manual Ingestion

| ID | Test | Expected |
|----|------|----------|
| ING-01 | POST `/api/market/AAPL/ingest` | 200 with `{ success: true, snapshot }` |
| ING-02 | Snapshot has all fields | `ticker`, `timestamp`, `currentPrice`, `priceChange`, `priceChangePercent`, `recommendations`, `priceTarget`, `metrics`, `news`, `earnings`, `catalysts`, `sentiment` |
| ING-03 | `currentPrice` > 0 | Real price, not zero |
| ING-04 | `recommendations` from Finnhub | Object with `strongBuy`, `buy`, `hold`, `sell`, `strongSell` counts |
| ING-05 | `news` array non-empty | At least 1 news item for AAPL |

### 11.2 Snapshot Retrieval

| ID | Test | Expected |
|----|------|----------|
| ING-06 | GET `/api/market/AAPL/snapshot` | Returns latest snapshot |
| ING-07 | Snapshot timestamp recent | Within 15 minutes of now (or triggers fresh ingestion) |
| ING-08 | Auto-ingestion on stale data | If snapshot > 15 min old, new one is auto-fetched |

### 11.3 Database Persistence

| ID | Test | Expected |
|----|------|----------|
| ING-09 | Row in `trader.stock_data_snapshots` | SQL: `SELECT * FROM trader.stock_data_snapshots WHERE ticker = 'AAPL'` returns >= 1 row |
| ING-10 | JSONB columns valid | `recommendations`, `price_target`, `metrics`, `news`, `earnings`, `catalysts` all parse as valid JSON |
| ING-11 | Upsert works | Ingest same ticker twice → row count unchanged (ON CONFLICT UPDATE) |

### 11.4 Embedding Creation

| ID | Test | Expected |
|----|------|----------|
| ING-12 | Embeddings stored in pgvector | After ingestion, vector search for "AAPL price" returns documents |
| ING-13 | Multiple document types | Documents include `stock_price`, `analyst_consensus`, `price_target`, `stock_news`, `earnings` types |

---

## 12. Politician Trades Tests

### 12.1 Data Fetching from Live APIs

| ID | Test | Expected |
|----|------|----------|
| POL-01 | Fetch House trades | GET `https://housestockwatcher.com/api/all_transactions` → 200, JSON array |
| POL-02 | House trade fields | Each entry has `representative`, `ticker`, `type`, `amount`, `disclosure_date`, `transaction_date` |
| POL-03 | Fetch Senate trades | GET `https://senatestockwatcher.com/api/all_transactions` → 200, JSON array |
| POL-04 | Senate trade fields | Each entry has `senator`, `ticker`, `type`, `amount`, `disclosure_date`, `transaction_date` |

### 12.2 Ticker Endpoint

| ID | Test | Expected |
|----|------|----------|
| POL-05 | GET `/api/market/AAPL/politician-trades` | 200, array of trade objects |
| POL-06 | Trade has `politician`, `chamber`, `tradeType`, `amount`, `transactionDate` | All fields present |
| POL-07 | Trades for popular ticker | AAPL, MSFT, or NVDA should have > 0 trades |

### 12.3 Politician Endpoint

| ID | Test | Expected |
|----|------|----------|
| POL-08 | GET `/api/politician/Pelosi/trades` | 200, `{ trades: [...] }` |
| POL-09 | Results contain matching politician | At least one entry for any commonly known politician |
| POL-10 | Limit parameter works | `?limit=5` → max 5 results |

### 12.4 Data Parsing

| ID | Test | Expected |
|----|------|----------|
| POL-11 | Amount range parsed | `"$1,001 - $15,000"` → `{ min: 1001, max: 15000 }` |
| POL-12 | Trade type normalized | `"Purchase"` → `"BUY"`, `"Sale"` → `"SELL"` |
| POL-13 | Ticker cleaned | Whitespace and special chars removed |

---

## 13. RAG Chat Assistant Tests

> Requires Azure OpenAI and pgvector. All responses from live LLM.

### 13.1 Basic Chat

| ID | Test | Expected |
|----|------|----------|
| CHAT-01 | POST `/api/chat` `{ question: "How is my portfolio?" }` | 200, `{ answer, sources, timestamp }` |
| CHAT-02 | Answer is non-empty string | `answer.length > 0` |
| CHAT-03 | Sources array present | `sources` is array (may be empty) |
| CHAT-04 | Timestamp present | Valid ISO 8601 string |

### 13.2 Ticker-Specific Questions

| ID | Test | Expected |
|----|------|----------|
| CHAT-05 | Question about AAPL | `{ question: "What's the latest on AAPL?", ticker: "AAPL" }` → answer references Apple |
| CHAT-06 | Sources include Finnhub data | At least one source of type `news` or `analyst_report` |
| CHAT-07 | Answer contains real data | Mentions actual price, earnings, or analyst info (not generic) |

### 13.3 Portfolio Context

| ID | Test | Expected |
|----|------|----------|
| CHAT-08 | "Why did we buy X?" | If user holds X, answer references the scoring/reasoning |
| CHAT-09 | "What's my risk?" | Answer mentions specific positions or risk metrics |

### 13.4 Actions in Response

| ID | Test | Expected |
|----|------|----------|
| CHAT-10 | "Should I buy NVDA?" | Response includes `actions` array with `type: 'buy'` or `type: 'analyze'` |
| CHAT-11 | Actions have correct format | Each action has `type`, `label`, optionally `ticker` |

### 13.5 Chat Suggestions

| ID | Test | Expected |
|----|------|----------|
| CHAT-12 | GET `/api/chat/suggestions` | 200, `{ suggestions: [...] }` |
| CHAT-13 | Suggestions are strings | Array of string suggestions |

### 13.6 Error Handling

| ID | Test | Expected |
|----|------|----------|
| CHAT-14 | Empty question → 400 | `{ question: "" }` → 400 error |
| CHAT-15 | Missing question → 400 | `{}` → 400 error |

---

## 14. Backtesting Engine Tests

### 14.1 Basic Backtest

| ID | Test | Expected |
|----|------|----------|
| BT-01 | Run backtest | POST `/api/backtest` with `{ startDate: "2024-01-01", endDate: "2024-06-30", initialCapital: 10000, rebalanceFrequency: "weekly", watchlist: ["AAPL", "MSFT", "GOOGL"], maxPositions: 3, positionSizePercent: 30 }` → 200 |
| BT-02 | Result has config | `result.config` matches input parameters |
| BT-03 | Result has snapshots | `result.snapshots` is non-empty array |
| BT-04 | Snapshot fields | Each has `date`, `portfolioValue`, `cash`, `positions`, `dailyReturn`, `cumulativeReturn` |
| BT-05 | Result has closedPositions | Array of completed trades |
| BT-06 | Result has metrics | Object with performance statistics |

### 14.2 Metrics Validation

| ID | Test | Expected |
|----|------|----------|
| BT-07 | `totalReturn` = final - initial | `metrics.totalReturn` = final portfolio value - initial capital |
| BT-08 | `totalReturnPercent` calculated | `(totalReturn / initialCapital) * 100` |
| BT-09 | `winRate` in [0, 100] | Percentage of winning trades |
| BT-10 | `sharpeRatio` is number | Real number (can be negative) |
| BT-11 | `maxDrawdown` <= 0 | Drawdown is non-positive |
| BT-12 | `totalTrades` = `winningTrades` + `losingTrades` | Math check |
| BT-13 | `profitFactor` >= 0 | Ratio of gross profits to gross losses |

### 14.3 Snapshot Consistency

| ID | Test | Expected |
|----|------|----------|
| BT-14 | First snapshot date = startDate | Dates match |
| BT-15 | Last snapshot date <= endDate | Not beyond end date |
| BT-16 | Portfolio value never negative | All snapshots have `portfolioValue >= 0` |
| BT-17 | Cash never negative | All snapshots have `cash >= 0` |

### 14.4 Risk Parameters

| ID | Test | Expected |
|----|------|----------|
| BT-18 | Stop-loss respected | If `stopLossPercent: 10`, no closed position lost > 10% (± slippage) |
| BT-19 | Take-profit respected | If `takeProfitPercent: 20`, positions sold when gain >= 20% |
| BT-20 | Max positions respected | No snapshot has more positions than `maxPositions` |

### 14.5 Strategy Comparison

| ID | Test | Expected |
|----|------|----------|
| BT-21 | POST `/api/backtest/compare` | 200, array of results |
| BT-22 | Multiple configs → multiple results | Each config produces independent result |

### 14.6 Validation Errors

| ID | Test | Expected |
|----|------|----------|
| BT-23 | Missing startDate → 400 | Error message |
| BT-24 | Missing watchlist → 400 | Error message |
| BT-25 | Non-array watchlist → 400 | Error message |

---

## 15. Paper Trading Tests

### 15.1 Portfolio Mode

| ID | Test | Expected |
|----|------|----------|
| PAPER-01 | Default mode is paper | GET `/api/portfolio/mode` → `{ mode: "paper" }` |
| PAPER-02 | Create paper portfolio | POST `/api/portfolio/paper` → 200 |

### 15.2 Paper Trades

| ID | Test | Expected |
|----|------|----------|
| PAPER-03 | Buy in paper mode | POST `/api/execute` `{ ticker: "AAPL", side: "buy", shares: 10 }` → success |
| PAPER-04 | Paper trade uses virtual cash | Cash decremented, not real money |
| PAPER-05 | Sell in paper mode | Sell shares → cash credited |
| PAPER-06 | Paper mode indicator | Portfolio response should be accessible in paper mode |

### 15.3 Database Verification

| ID | Test | Expected |
|----|------|----------|
| PAPER-07 | `trader.user_portfolio_mode` row | SQL: `SELECT mode FROM trader.user_portfolio_mode WHERE user_id = $1` → `'paper'` |
| PAPER-08 | Paper capital stored | `paper_capital` column has default or configured value |

---

## 16. Go-Live Transition Tests

### 16.1 Successful Transition

| ID | Test | Expected |
|----|------|----------|
| LIVE-01 | Go live with correct confirmation | POST `/api/portfolio/go-live` `{ confirmationText: "GO LIVE" }` → `{ success: true, mode: "live" }` |
| LIVE-02 | Mode persisted | GET `/api/portfolio/mode` → `{ mode: "live" }` |
| LIVE-03 | `switched_to_live_at` set | Database column has timestamp |

### 16.2 Rejection Cases

| ID | Test | Expected |
|----|------|----------|
| LIVE-04 | Wrong confirmation text | `{ confirmationText: "go live" }` → 400 error |
| LIVE-05 | Empty confirmation | `{ confirmationText: "" }` → 400 error |
| LIVE-06 | Missing confirmation | `{}` → 400 error |
| LIVE-07 | Already live → error | Second call after already live → appropriate error |

---

## 17. Leaderboard Tests

### 17.1 Leaderboard Data

| ID | Test | Expected |
|----|------|----------|
| LB-01 | GET `/api/leaderboard?mode=paper&period=monthly&page=1` | 200, `{ entries, totalUsers, page, totalPages }` |
| LB-02 | Entry fields | Each has `rank`, `displayName`, `returnPercent`, `sharpeRatio`, `winRate`, `totalTrades`, `isCurrentUser` |
| LB-03 | Exactly one `isCurrentUser: true` | Current user marked in results |
| LB-04 | `isCurrentUser` stripped of `_userId` | No `_userId` field in response |
| LB-05 | Ranks are sequential | rank values are 1, 2, 3, ... |
| LB-06 | Pagination works | Page 1 and page 2 return different entries (if enough users) |

### 17.2 User Rank

| ID | Test | Expected |
|----|------|----------|
| LB-07 | GET `/api/leaderboard/me?mode=paper&period=monthly` | 200, `{ rank, totalUsers, topPercent, returnPercent, period, mode }` |
| LB-08 | `rank` >= 1 | Valid rank |
| LB-09 | `topPercent` calculated | `(rank / totalUsers) * 100` approximately |
| LB-10 | `period` and `mode` match request | Echo back the requested filters |

### 17.3 Period Filters

| ID | Test | Expected |
|----|------|----------|
| LB-11 | Daily leaderboard | `?period=daily` → 200 |
| LB-12 | Weekly leaderboard | `?period=weekly` → 200 |
| LB-13 | Monthly leaderboard | `?period=monthly` → 200 |
| LB-14 | All-time leaderboard | `?period=all_time` → 200 |

### 17.4 Mode Filters

| ID | Test | Expected |
|----|------|----------|
| LB-15 | Paper mode leaderboard | `?mode=paper` → entries from paper traders |
| LB-16 | Live mode leaderboard | `?mode=live` → entries from live traders |

---

## 18. Achievements Tests

### 18.1 Achievement Data

| ID | Test | Expected |
|----|------|----------|
| ACH-01 | GET `/api/achievements/me` | 200, array of achievement objects |
| ACH-02 | Achievement fields | Each has `id` (number), `name`, `description`, `icon`, `category`, `earnedAt`, `progress`, `progressTarget`, `progressCurrent` |
| ACH-03 | `id` is number not string | `typeof achievement.id === 'number'` |
| ACH-04 | `earnedAt` null for unearned | Locked achievements have `earnedAt: null` |
| ACH-05 | `progressCurrent` <= `progressTarget` | Progress doesn't exceed target |
| ACH-06 | `progress` calculated | `progress = progressCurrent / progressTarget` or similar |
| ACH-07 | Categories valid | `category` is one of defined categories (e.g., "trading", "streak", "social") |

### 18.2 Database Verification

| ID | Test | Expected |
|----|------|----------|
| ACH-08 | `trader.achievements` populated | At least 1 row defining available achievements |
| ACH-09 | `trader.user_achievements` links | JOIN on `achievement_id` produces valid results |

---

## 19. Visibility & Privacy Tests

### 19.1 Read Visibility

| ID | Test | Expected |
|----|------|----------|
| VIS-01 | GET `/api/user/profile/visibility` | 200, `{ showOnLeaderboard, displayName }` |
| VIS-02 | Defaults | New user: `showOnLeaderboard: true`, `displayName` is empty or default |

### 19.2 Update Visibility

| ID | Test | Expected |
|----|------|----------|
| VIS-03 | Set display name | PUT `{ displayName: "TestTrader" }` → persisted |
| VIS-04 | Hide from leaderboard | PUT `{ showOnLeaderboard: false }` → persisted |
| VIS-05 | Verify leaderboard respects visibility | After hiding, user should not appear in leaderboard (or appear as "Anonymous") |

### 19.3 Database Verification

| ID | Test | Expected |
|----|------|----------|
| VIS-06 | Row in `trader.user_visibility` | SQL confirms `user_id`, `show_on_leaderboard`, `display_name` |
| VIS-07 | Upsert works | Second PUT updates existing row, doesn't create duplicate |

---

## 20. Frontend Route & Navigation Tests

> Run against the frontend dev server (`http://localhost:5173`). Use browser automation (Playwright/Cypress) or manual verification.

### 20.1 Routes Load

| ID | Test | URL | Expected |
|----|------|-----|----------|
| NAV-01 | Root redirect | `/` | Redirects to dashboard or shows sign-in |
| NAV-02 | Dashboard | `/dashboard` | Dashboard component renders |
| NAV-03 | Stock detail | `/stock/AAPL` | Stock detail page with AAPL data |
| NAV-04 | Leaderboard | `/leaderboard` | Leaderboard page renders |
| NAV-05 | Achievements | `/achievements` | Achievements page renders |
| NAV-06 | Backtesting | `/backtest` | Backtest form renders |
| NAV-07 | Settings | `/settings` | Settings page renders |
| NAV-08 | 404 redirect | `/nonexistent` | Redirects to `/dashboard` |

### 20.2 Navigation Links

| ID | Test | Expected |
|----|------|----------|
| NAV-09 | Dashboard nav link | Click → navigates to `/dashboard` |
| NAV-10 | Leaderboard nav link | Click → navigates to `/leaderboard` |
| NAV-11 | Backtesting nav link | Click → navigates to `/backtest` |
| NAV-12 | Achievements nav link | Click → navigates to `/achievements` |
| NAV-13 | Settings nav link | Click → navigates to `/settings` |
| NAV-14 | Logo link | Click → navigates to `/dashboard` |
| NAV-15 | Active link highlighted | Current route's nav link has `active` class |

### 20.3 Ticker Search

| ID | Test | Expected |
|----|------|----------|
| NAV-16 | Type "AAPL" + Enter | Navigates to `/stock/AAPL` |
| NAV-17 | Lowercase auto-uppercased | Type "aapl" → navigates to `/stock/AAPL` |
| NAV-18 | Empty search ignored | Press Enter with empty input → no navigation |

### 20.4 Ticker Tape

| ID | Test | Expected |
|----|------|----------|
| NAV-19 | Ticker tape renders | Scrolling stock symbols visible below header |
| NAV-20 | Click ticker | Click on a ticker in tape → navigates to `/stock/{ticker}` |

---

## 21. Frontend Component Integration Tests

### 21.1 Dashboard

| ID | Test | Expected |
|----|------|----------|
| UI-01 | HeroBalanceCard renders | Shows portfolio value, cash, P&L |
| UI-02 | Paper mode banner visible | When mode=paper, yellow "PAPER TRADING" banner shown |
| UI-03 | Positions table populates | Lists positions with ticker, shares, P&L |
| UI-04 | Scores table populates | Lists watchlist stocks with scores |
| UI-05 | Buy button opens TradePanel | Click Buy → modal opens with share input |
| UI-06 | Sell button opens TradePanel | Click Sell → modal opens with current shares |
| UI-07 | TradePanel submit works | Enter shares, submit → trade executed, modal closes |
| UI-08 | No `prompt()` or `confirm()` | Browser dialogs never appear for trading |

### 21.2 Stock Detail Page

| ID | Test | Expected |
|----|------|----------|
| UI-09 | Price chart renders | SVG chart with price line visible |
| UI-10 | Timeframe buttons work | Click 1D/1W/1M/3M/1Y → chart updates |
| UI-11 | Analyst consensus displayed | Shows buy/hold/sell counts |
| UI-12 | Price targets displayed | Shows target high/mean/low |
| UI-13 | News section populated | Lists news headlines from Finnhub |
| UI-14 | Earnings data shown | Recent earnings with surprise % |
| UI-15 | Technical indicators shown | RSI, MACD, Bollinger, Stochastic values |
| UI-16 | Politician trades section | Shows congressional trades for this ticker |

### 21.3 Settings Page

| ID | Test | Expected |
|----|------|----------|
| UI-17 | Profile fields editable | Name, email, capital inputs work |
| UI-18 | Risk parameters editable | Stop-loss, circuit breaker, cash reserve sliders work |
| UI-19 | Save button persists | Click Save → success message, data persisted |
| UI-20 | Go-Live section (paper mode only) | Button visible when mode=paper |
| UI-21 | Go-Live modal | Click → modal with "GO LIVE" confirmation input |
| UI-22 | Go-Live confirmation required | Button disabled until "GO LIVE" typed |
| UI-23 | Leaderboard visibility toggle | Toggle on/off, display name editable |
| UI-24 | Watchlist manager | Add/remove tickers, create watchlists |

### 21.4 Leaderboard Page

| ID | Test | Expected |
|----|------|----------|
| UI-25 | Ranked table renders | Shows trader names, returns, Sharpe, win rate |
| UI-26 | Period tabs work | Click Daily/Weekly/Monthly/All Time → table updates |
| UI-27 | Mode toggle works | Switch Paper/Live → table updates |
| UI-28 | Current user highlighted | Current user's row has distinct styling |
| UI-29 | Your Rank card | Shows rank position and percentile |

### 21.5 Achievements Page

| ID | Test | Expected |
|----|------|----------|
| UI-30 | Badge grid renders | Achievement cards visible |
| UI-31 | Earned badges full color | Earned achievements have colored icons |
| UI-32 | Locked badges greyed | Unearned achievements appear desaturated |
| UI-33 | Progress bars accurate | `progressCurrent / progressTarget` visualized |
| UI-34 | Category filter works | Click Trading/Streak/Social → filters cards |

### 21.6 Chat Widget

| ID | Test | Expected |
|----|------|----------|
| UI-35 | Chat button visible | Bottom-right chat icon |
| UI-36 | Chat opens/closes | Click → chat panel opens, click again → closes |
| UI-37 | Send message works | Type question, send → assistant response appears |
| UI-38 | Sources displayed | Response includes source citations |
| UI-39 | Actions displayed | Quick-action buttons for buy/sell/analyze appear |

---

## 22. Risk Controls Tests

### 22.1 Stop-Loss (PRD Section 8)

| ID | Test | Expected |
|----|------|----------|
| RISK-01 | Stop-loss trigger | Position at -15% from entry → auto-exit |
| RISK-02 | Stop-loss configurable | User sets 10% in settings → triggers at -10% |
| RISK-03 | Sell trade recorded | Stop-loss exit appears in trade history with reason |

### 22.2 Circuit Breaker

| ID | Test | Expected |
|----|------|----------|
| RISK-04 | Circuit breaker at -30% | Portfolio drawdown > 30% from peak → trading halted |
| RISK-05 | No new trades after circuit breaker | Attempts to buy after halt → blocked |

### 22.3 Cash Reserve

| ID | Test | Expected |
|----|------|----------|
| RISK-06 | Minimum cash $10 | Cannot buy if it would reduce cash below $10 |

### 22.4 Position Size Caps

| ID | Test | Expected |
|----|------|----------|
| RISK-07 | Max 90% allocation | Single position cannot exceed 90% of portfolio value |

---

## 23. Error Handling & Graceful Degradation Tests

### 23.1 External API Failures

| ID | Test | Expected |
|----|------|----------|
| ERR-01 | Finnhub returns empty data | Score/analysis still returns (with zeros or empty arrays) |
| ERR-02 | Yahoo Finance unavailable | MarketData falls back to mock data (controlled degradation) |
| ERR-03 | Azure OpenAI unavailable | Chat returns 503 with helpful message |
| ERR-04 | Politician trades API down | Endpoint returns empty array, not 500 |

### 23.2 Invalid Input

| ID | Test | Expected |
|----|------|----------|
| ERR-05 | SQL injection attempt in ticker | `/api/market/'; DROP TABLE--/news` → 200 with empty data (parameterized queries prevent injection) |
| ERR-06 | XSS in user profile | `{ full_name: "<script>alert(1)</script>" }` → stored as text, not executed |
| ERR-07 | Very long ticker | `/api/market/AAAAAAAAAAAAAAAAAA` → graceful empty response |

### 23.3 Server Errors

| ID | Test | Expected |
|----|------|----------|
| ERR-08 | Internal error format | All 500 responses have `{ error: "message" }` format |
| ERR-09 | No stack traces in response | Error responses don't leak server internals |

---

## 24. Performance & Response Time Tests

> Targets from PRD Section 17.

| ID | Test | Target | Endpoint |
|----|------|--------|----------|
| PERF-01 | Portfolio data | < 500ms | GET `/api/portfolio` |
| PERF-02 | Positions data | < 500ms | GET `/api/positions` |
| PERF-03 | Trade history | < 500ms | GET `/api/trades` |
| PERF-04 | Stock analysis | < 2s | GET `/api/market/AAPL` |
| PERF-05 | AI chat response | < 5s | POST `/api/chat` |
| PERF-06 | Data ingestion | < 10s | POST `/api/market/AAPL/ingest` |
| PERF-07 | Chart data | < 2s | GET `/api/market/AAPL/chart?timeframe=1M` |
| PERF-08 | Leaderboard | < 500ms | GET `/api/leaderboard` |
| PERF-09 | Watchlist scores | < 5s | GET `/api/scores` (many tickers) |
| PERF-10 | Technical indicators | < 2s | GET `/api/market/AAPL/indicators` |

---

## 25. Database Integrity Tests

### 25.1 Schema Verification

| ID | Test | Expected |
|----|------|----------|
| DB-01 | `trader.users` exists | Table with `user_id`, `email`, `full_name`, `initial_capital`, `settings`, `created_at`, `last_login` |
| DB-02 | `trader.watchlists` exists | Table with `id`, `user_id`, `name`, `tickers`, `created_at`, `updated_at` |
| DB-03 | `trader.portfolios` exists | Table with `id`, `user_id`, `initial_capital`, `current_value`, `cash`, `peak_value` |
| DB-04 | `trader.positions` exists | Table with `id`, `portfolio_id`, `user_id`, `ticker`, `shares`, `entry_price`, `current_price`, `entry_score` |
| DB-05 | `trader.trades` exists | Table with `id`, `portfolio_id`, `user_id`, `ticker`, `trade_type`, `shares`, `price`, `score`, `reason` |
| DB-06 | `trader.user_visibility` exists | Table with `id`, `user_id` (unique), `show_on_leaderboard`, `display_name` |
| DB-07 | `trader.user_portfolio_mode` exists | Table with `id`, `user_id` (unique), `mode`, `paper_capital` |
| DB-08 | `trader.achievements` exists | Table with `id`, `name`, `description`, `icon`, `category`, `progress_target` |
| DB-09 | `trader.user_achievements` exists | Table with `id`, `user_id`, `achievement_id`, `earned_at`, `progress_current` |
| DB-10 | `trader.stock_data_snapshots` exists | Table with composite PK `(ticker, timestamp)` |

### 25.2 Foreign Key Integrity

| ID | Test | Expected |
|----|------|----------|
| DB-11 | `user_achievements.achievement_id` valid | All values exist in `achievements.id` |
| DB-12 | `positions.portfolio_id` valid | All values exist in `portfolios.id` |
| DB-13 | `trades.portfolio_id` valid | All values exist in `portfolios.id` |

### 25.3 User Isolation

| ID | Test | Expected |
|----|------|----------|
| DB-14 | User A data isolation | User A cannot query User B's portfolios/positions/trades |
| DB-15 | Watchlist isolation | User A's watchlists not visible to User B |
| DB-16 | Visibility isolation | User A's visibility settings not editable by User B |

---

## 26. Security Tests

### 26.1 Authentication

| ID | Test | Expected |
|----|------|----------|
| SEC-01 | All protected routes require auth | 33 endpoints require `requireAuth` middleware |
| SEC-02 | Only `/health` is public | No other unauthenticated endpoint exists |

### 26.2 SQL Injection Prevention

| ID | Test | Expected |
|----|------|----------|
| SEC-03 | Parameterized queries | All SQL uses `${value}` template literals (Neon tagged templates) |
| SEC-04 | Ticker injection | `ticker = "'; DROP TABLE trader.users;--"` → query returns empty, table intact |
| SEC-05 | User ID injection | Manipulated userId → no cross-user data access |

### 26.3 API Key Protection

| ID | Test | Expected |
|----|------|----------|
| SEC-06 | No API keys in responses | Grep all response bodies for Finnhub/Azure/Clerk keys → zero matches |
| SEC-07 | No API keys in error messages | Error responses don't leak credentials |

### 26.4 Input Validation

| ID | Test | Expected |
|----|------|----------|
| SEC-08 | Backtest date validation | Future endDate or startDate after endDate → error |
| SEC-09 | Numeric field validation | Negative shares, negative capital → error |
| SEC-10 | String length limits | Extremely long strings (10000+ chars) → handled gracefully |

---

## Test Execution Checklist

### Pre-Run Checklist

- [ ] All environment variables set and verified
- [ ] Neon test branch/schema created and clean
- [ ] Backend server running and healthy (`GET /health` → 200)
- [ ] Frontend dev server running (`http://localhost:5173`)
- [ ] Clerk test user JWT token obtained
- [ ] Finnhub API key valid (test with single `GET /stock/recommendation?symbol=AAPL&token=KEY`)
- [ ] Azure OpenAI deployment accessible
- [ ] housestockwatcher.com and senatestockwatcher.com reachable

### Execution Order (Recommended)

1. **Auth tests** (AUTH-*) — verify security layer first
2. **User profile tests** (PROF-*) — setup test user
3. **Watchlist tests** (WL-*) — setup test watchlists
4. **Market data tests** (FH-*, YF-*, TI-*) — verify external APIs
5. **Scoring tests** (SCORE-*) — verify analysis engine
6. **Trade tests** (TRADE-*) — verify trade execution
7. **Portfolio tests** (PORT-*) — verify portfolio state
8. **Ingestion tests** (ING-*) — verify data pipeline
9. **Politician trades tests** (POL-*) — verify scraping
10. **Chat tests** (CHAT-*) — verify RAG assistant
11. **Backtest tests** (BT-*) — verify backtesting engine
12. **Paper trading tests** (PAPER-*) — verify paper mode
13. **Go-live tests** (LIVE-*) — verify transition
14. **Leaderboard tests** (LB-*) — verify leaderboard
15. **Achievements tests** (ACH-*) — verify achievements
16. **Visibility tests** (VIS-*) — verify privacy
17. **Frontend tests** (NAV-*, UI-*) — verify UI
18. **Risk tests** (RISK-*) — verify risk controls
19. **Error handling tests** (ERR-*) — verify degradation
20. **Performance tests** (PERF-*) — verify latency
21. **DB integrity tests** (DB-*) — verify data
22. **Security tests** (SEC-*) — final security pass

### Post-Run

- [ ] Clean up test data from Neon branch
- [ ] Record test results and any failures
- [ ] File issues for failing tests
- [ ] Update this document with any new test cases discovered

---

## Test Count Summary

| Section | Tests |
|---------|-------|
| Authentication | 18 |
| User Profile | 10 |
| Watchlist | 10 |
| Portfolio | 10 |
| Scoring & Analysis | 13 |
| Trade Execution | 15 |
| Finnhub API | 16 |
| Yahoo Finance | 15 |
| Technical Indicators | 12 |
| Data Ingestion | 13 |
| Politician Trades | 13 |
| RAG Chat | 15 |
| Backtesting | 25 |
| Paper Trading | 8 |
| Go-Live | 7 |
| Leaderboard | 16 |
| Achievements | 9 |
| Visibility | 7 |
| Frontend Routes | 20 |
| Frontend Components | 39 |
| Risk Controls | 7 |
| Error Handling | 9 |
| Performance | 10 |
| Database Integrity | 16 |
| Security | 10 |
| **TOTAL** | **358** |

---

*Generated: February 6, 2026*
*Based on: PRD v2.0 (Production)*
*Zero mock data — all tests against live services*
