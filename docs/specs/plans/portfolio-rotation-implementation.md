# Implementation Plan: Portfolio Rotation Agent

## Overview

Execute the return-maximization specification by building a Python agent that scans watchlists, scores opportunities, rotates positions, and tracks performance with aggressive position sizing and minimal cash drag. Implementation follows spec-first principles with LangChain-powered reasoning traces.

---

## Phase 1: Foundation & Data Layer

### 1.1 Project Structure
```
trader/
├── src/
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── portfolio_rotation.py      # Main agent orchestrator
│   │   ├── scanner.py                 # Signal detection & scoring
│   │   ├── scorer.py                  # Expected return calculation
│   │   ├── position_sizer.py          # Kelly-inspired sizing
│   │   └── rotation_engine.py         # Rotation decision logic
│   ├── data/
│   │   ├── market_data.py             # Real-time price/technical data
│   │   ├── watchlist.py               # Watchlist management
│   │   └── cache.py                   # Caching layer
│   ├── models/
│   │   ├── portfolio.py               # Portfolio state model
│   │   ├── position.py                # Position tracking
│   │   └── trade.py                   # Trade execution model
│   └── utils/
│       ├── indicators.py              # RSI, MACD, volume calculations
│       ├── formatting.py              # JSON output formatting
│       └── performance.py             # Return tracking & analytics
├── tests/
│   ├── test_scorer.py
│   ├── test_position_sizer.py
│   ├── test_rotation_engine.py
│   └── test_integration.py
├── data/
│   ├── watchlist.json                 # Seed watchlist
│   └── backtest_data.csv              # Historical data for validation
└── main.py                            # CLI entry point
```

### 1.2 Dependencies
```
yfinance              # Market data fetching
pandas                # Data manipulation
numpy                 # Numerical calculations
python-dateutil       # Date handling
requests              # HTTP for news sentiment
pytest                # Testing framework
```

**Deliverable:** `requirements.txt`, project structure scaffolding

---

## Phase 2: Core Scoring Engine

### 2.1 Signal Detection (`scanner.py`)
**Inputs:** Current ticker, price data, sentiment, analyst data
**Outputs:** Triggered catalysts with weights

Implement:
- Analyst upgrade detection (15%+ target increase)
- Earnings surprise calculation (>+10%)
- RSI > 50 crossover detection
- MACD bullish crossover detection
- Volume surge detection (>2x 20-day avg)
- News sentiment parsing (>0.7 threshold)
- Sector rotation detection

**Deliverable:** `Scanner` class with `detect_catalysts(ticker, market_data)` → list of (signal, weight) tuples

---

### 2.2 Expected Return Score (`scorer.py`)
**Inputs:** Catalyst strength, momentum, upside potential, timing
**Outputs:** Single expected_return_score (0-1)

Implement:
- Catalyst strength aggregation (sum of triggered weights, capped at 1.0)
- Momentum acceleration calculation:
  - RSI delta normalized
  - MACD histogram delta normalized
- Upside potential from analyst targets (capped at 1.0)
- Timing factor:
  - +0.5 for early entry (RSI 40-60, MACD bullish)
  - +0.25 for mid-momentum (RSI 60-70)
  - 0 for late momentum (RSI 70-75)
  - -0.5 for extended (RSI > 75 or MACD weakening)
- Final formula: (catalyst × 0.40) + (momentum × 0.30) + (upside × 0.20) + (timing × 0.10)

**Deliverable:** `Scorer` class with `score(ticker, market_data, analyst_data)` → float (0-1)

---

### 2.3 Technical Indicators (`utils/indicators.py`)
**Inputs:** Price series, volume
**Outputs:** RSI, MACD, MACD histogram, volume ratios

Implement:
- RSI(14): Relative Strength Index
- MACD(12,26,9): Moving Average Convergence Divergence
- Volume ratio: current vol / 20-day average

**Deliverable:** Reusable indicator functions

---

## Phase 3: Position Management

### 3.1 Position Sizing (`position_sizer.py`)
**Inputs:** Expected return score (0-1)
**Outputs:** Position size as % of portfolio

Implement Kelly formula:
- Confidence = expected_return_score
- Base allocation = 50%
- Position size = min(base + (confidence × 0.40), 0.90)
- Validate: never >90%, never <10%

**Deliverable:** `PositionSizer` class with `calculate_size(score)` → float (0.10-0.90)

---

### 3.2 Portfolio Model (`models/portfolio.py`)
**Inputs:** Initial capital, existing positions
**Outputs:** Current portfolio state with tracking

Implement:
- Cash balance tracking
- Holdings: ticker → (shares, entry_price, current_price, entry_score)
- Performance metrics: total_return_pct, daily_compound, annualized_return
- Drawdown tracking: peak, current drawdown %
- Trade history: list of all rotations with P&L

**Deliverable:** `Portfolio` class with methods:
- `add_position(ticker, shares, price, score)`
- `remove_position(ticker, price)`
- `update_prices(price_dict)`
- `calculate_metrics()`
- `get_state()` → JSON-serializable dict

---

## Phase 4: Rotation Engine

### 4.1 Rotation Logic (`rotation_engine.py`)
**Inputs:** Portfolio state, watchlist scores
**Outputs:** Rotation recommendation (if any)

Implement decision framework:
```
FOR each holding:
    FOR each watchlist candidate:
        IF candidate.score > holding.score:
            rotation_gain = candidate.score - holding.score
            IF rotation_gain > 0.02 (transaction cost threshold):
                QUEUE as candidate rotation

RANK by rotation_gain (descending)
EXECUTE highest-gain rotation if cash sufficient
```

**Deliverable:** `RotationEngine` class with:
- `evaluate_rotations(portfolio, watchlist_scores)` → list of rotation tuples
- `execute_rotation(portfolio, sell_ticker, buy_ticker, prices)` → updated portfolio

---

### 4.2 Exit Signals (`scanner.py` extension)
Sell current holding when ANY trigger:
- Watchlist candidate scores higher (even 0.01 differential)
- RSI > 75 (overbought)
- MACD bearish crossover
- Analyst price target hit
- 3 consecutive days of negative score change

**Deliverable:** Extended `Scanner` with `should_exit(ticker, market_data)` → bool

---

## Phase 5: Risk Controls

### 5.1 Guardrails (`models/portfolio.py` extension)
Implement circuit breakers:
- Stop-loss: Auto-exit if position down -15% from entry
- Max drawdown: If peak-to-current > -30%, halt new entries
- Minimum cash: Always maintain $10+ for next trade
- Earnings blackout: Skip entries 2 days before earnings

**Deliverable:** Methods in Portfolio class

---

## Phase 6: Output & Formatting

### 6.1 Trade Plan JSON (`utils/formatting.py`)
Format output per spec Section 8:
```json
{
  "generated_at": "ISO timestamp",
  "objective": "MAXIMIZE_RETURN",
  "portfolio_value": float,
  "total_return_pct": float,
  "annualized_return_pct": float,
  "recommendation": "ROTATE" | "HOLD" | "CIRCUIT_BREAKER",
  "rotation": { "sell": {...}, "buy": {...} },
  "expected_improvement": "string",
  "position_size": "string",
  "post_trade_cash": float
}
```

**Deliverable:** `TradeFormatter` class

---

### 6.2 Performance Dashboard JSON (`utils/formatting.py`)
Format per spec Section 8:
```json
{
  "performance": {
    "starting_capital": float,
    "current_value": float,
    "total_return": "string",
    "daily_compound_rate": "string",
    "annualized_rate": "string",
    "sharpe_ratio": float,
    "max_drawdown": "string",
    "win_rate": "string",
    "profit_factor": float,
    "total_rotations": int
  }
}
```

**Deliverable:** `PerformanceFormatter` class

---

## Phase 7: Integration & CLI

### 7.1 Main Agent (`portfolio_rotation.py`)
Orchestrator that ties all components:
```
1. Load portfolio state + watchlist
2. Fetch latest market data
3. Score all watchlist candidates
4. Evaluate rotation opportunities
5. Execute highest-conviction rotation (if qualified)
6. Update portfolio state
7. Calculate performance metrics
8. Output trade plan + dashboard
9. Save state to disk
```

**Deliverable:** `PortfolioRotationAgent` class with `run()` method

---

### 7.2 CLI Entry (`main.py`)
```
python main.py --mode [analyze | trade | backtest]
               --capital [float]
               --watchlist [json file]
               --output [json]
```

Options:
- `--mode analyze`: Dry-run, show recommendations without executing
- `--mode trade`: Execute rotations (paper trading)
- `--mode backtest`: Run against historical data
- `--capital`: Starting capital (default $10,000)
- `--watchlist`: Custom watchlist JSON (default uses seed list)
- `--output`: Save results to JSON file

**Deliverable:** CLI interface with argument parsing

---

## Phase 8: Testing & Validation

### 8.1 Unit Tests
- `test_scorer.py`: Score calculation accuracy
- `test_position_sizer.py`: Kelly formula validation
- `test_rotation_engine.py`: Rotation logic correctness
- `test_indicators.py`: Technical indicator accuracy

**Targets:** >85% code coverage

### 8.2 Integration Tests
- Full workflow: watchlist → scores → rotations → portfolio update
- Edge cases: insufficient cash, no rotations available, circuit breaker triggers
- Performance: agent runs in <5 seconds for 50 watchlist tickers

### 8.3 Backtesting
Validate against historical data (2023-2024):
- Bull market: Expect >50% annual return
- Correction: Expect max drawdown <35%
- Win rate >55%, Sharpe >1.5, Profit factor >2.0

**Deliverable:** `tests/test_backtest.py` with historical validation

---

## Phase 9: Seed Data & Documentation

### 9.1 Watchlist (`data/watchlist.json`)
High-beta, high-volume seed tickers:
```json
{
  "tickers": [
    "NVDA", "AMD", "SMCI", "AVGO", "MRVL",
    "TSLA", "RIVN",
    "PLTR", "CRWD", "NET", "DDOG",
    "ANET", "PANW",
    "COIN", "MSTR"
  ]
}
```

### 9.2 API Keys & Config
Document required data sources:
- yfinance (free, built-in)
- Finnhub or Alpha Vantage (analyst data, sentiment)
- Config file for API keys

**Deliverable:** `config.template.json` + setup instructions

---

## Implementation Timeline

| Phase | Tasks | Effort | Dependencies |
|-------|-------|--------|--------------|
| 1 | Project setup, deps | 2h | — |
| 2 | Scoring engine | 8h | Phase 1 |
| 3 | Position mgmt | 6h | Phase 1-2 |
| 4 | Rotation engine | 6h | Phase 2-3 |
| 5 | Risk controls | 4h | Phase 3 |
| 6 | Output formatting | 4h | Phase 3 |
| 7 | Integration & CLI | 6h | Phase 2-6 |
| 8 | Testing | 8h | Phase 7 |
| 9 | Seed data & docs | 4h | Phase 8 |
| **Total** | — | **48h** | — |

---

## Success Criteria

✓ All acceptance criteria from feature spec met
✓ Agent generates valid trade recommendations per spec format
✓ Position sizing follows Kelly formula (50-90% range)
✓ Rotation threshold: 0.02 or higher triggers rotation
✓ All risk controls enforce (stop-loss, max drawdown, cash minimum)
✓ Backtest: >50% annual return, Sharpe >1.5, Max DD <35%
✓ CLI runs without errors, outputs valid JSON
✓ Unit test coverage >85%
✓ Performance: <5 second runtime for full watchlist
✓ LangChain reasoning traces enable explainability
✓ Code links back to spec sections (traceability)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Data quality (stale prices, gaps) | Cache validation, fallback to previous close |
| API rate limits | Implement exponential backoff, caching |
| Rotation thrashing (too many trades) | Transaction cost threshold (0.02), hold period analysis |
| Overfitting to backtest data | Validate across multiple time periods, out-of-sample test |
| Large drawdowns in live trading | Circuit breaker at -30%, stop-loss at -15% per position |
