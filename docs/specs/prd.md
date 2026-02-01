# Portfolio Rotation Agent — Product Requirements Document (BMAD-refined)

## BMAD Summary

### Background
The Portfolio Rotation Agent is a spec-first trading system whose objective is to maximize compounded portfolio return by concentrating capital into the highest-conviction, momentum-driven opportunities while enforcing ruin-prevention risk controls.

### Mission
- Aggressively capture momentum opportunities and reallocate capital when higher-expected-return candidates appear.
- Produce auditable reasoning traces for every trade decision.
- Meet measurable backtest targets and provide reproducible evaluation artifacts.

### Approach
- Implement a deterministic pipeline: Scanner → Risk Filter → Scorer → Comparator → Executor.
- Score each security using the PRD formula (40% catalyst, 30% momentum, 20% upside, 10% timing).
- Rotate when candidate.score − holding.score > 0.02, executing highest-gain rotations first while respecting stop-loss, cash buffer, and circuit-breaker rules.

### Deliverables (MVP)
- Working scoring engine and rotation engine producing trade-plan JSON with reasoning_trace.
- Portfolio model with P&L, stop-loss, and circuit-breaker enforcement.
- Unit and integration tests for indicators, scoring, sizing, and rotation logic (target coverage ≥ 85% on core modules).
- Backtest reports for 2023–2024 and stress scenarios (bull, correction, sideways).

---

## 1. Objective
Maximize portfolio return through disciplined, testable, and auditable aggressive rotation into the highest-momentum opportunities.

## 2. Data Requirements

### Per-Ticker Data (minimum fields)
- Price: current price, intraday snapshot, 14/20/50/260-day history
- Analyst: most recent rating change, target price, firm, date
- Earnings: last EPS (actual vs estimate), surprise %, next earnings date
- Technical: RSI(14), MACD histogram, MACD signal, SMA(20/50)
- News: headlines, source, sentiment score (-1 to +1)
- Volume: current volume, 20-day average volume

### Data Handling
- Cache responses with configurable TTL (default 1 hour).
- Backoff and retry strategy for transient failures; escalate persistent failures to monitoring.
- Skip tickers gracefully when required fields unavailable; log skip reason.

---

## 3. Signal Detection (Entry & Exit)

### Entry Signals (Bullish Catalysts) — weights shown
- Analyst upgrade with ≥15% target increase: 0.25
- Earnings surprise > +10%: 0.20
- RSI crossing above 50 from below: 0.15
- MACD bullish crossover: 0.15
- Volume surge > 2× 20-day average: 0.10
- News sentiment spike (>0.7): 0.10
- Sector rotation inflow (flow data): 0.05

Signals are normalized and summed to compute catalyst_strength in [0,1].

### Exit Signals (any triggered → consider exit)
- Candidate in watchlist has a higher score (see rotation logic)
- RSI > 75
- MACD bearish crossover
- Price target (analyst) achieved
- 3 consecutive days of declining momentum score

---

## 4. Scoring System (formal)

Expected return score (bounded 0..1):

expected_return_score =
  0.40 * catalyst_strength +
  0.30 * momentum_acceleration +
  0.20 * upside_potential +
  0.10 * timing_factor

Where:
- catalyst_strength ∈ [0,1] is sum of triggered signal weights (clipped at 1).
- momentum_acceleration ∈ [-1,1] = normalized RSI delta + normalized MACD histogram delta.
- upside_potential ∈ [0,1] = min(1.0, (analyst_target_price - current_price)/current_price).
- timing_factor ∈ [-0.5,0.5] with discrete buckets (see table below).

Timing factor (discrete):
- RSI 40–60 & MACD just crossed bullish: +0.5
- RSI 60–70 & MACD positive: +0.25
- RSI 70–75: 0
- RSI > 75 or MACD weakening: -0.5

Implementation note: all intermediate values must be documented in the reasoning_trace.

---

## 5. Position Sizing

Kelly-inspired deterministic sizing:

position_size_pct = min(0.50 + (confidence × 0.40), 0.90)

where confidence = expected_return_score (0..1). Final position allocation reported as percentage of portfolio.

Minimum practical allocation (implementation): ensure at least one share is purchasable and maintain a configurable cash buffer (default $10).

---

## 6. Rotation Logic (deterministic)

Algorithm (pseudocode):

FOR each holding H:
  FOR each candidate C not currently held:
    rotation_gain = C.score - H.score
    IF rotation_gain > rotation_threshold (0.02):
      enqueue rotation (H → C) with rotation_gain

Sort queued rotations by rotation_gain desc; execute in order until cash/constraints exhausted.

Parameters (configurable):
- rotation_threshold = 0.02
- max_position_size_pct = 0.90
- cash_buffer = $10
- minimum_hold_period = 0 (configurable)

---

## 7. Processing Pipeline

WATCHLIST → SCANNER → RISK FILTER → SCORER → COMPARATOR → EXECUTOR → LOG

Each stage emits structured outputs that are appended to `reasoning_trace` for that run.

---

## 8. Risk Controls (Ruin Prevention)

- Stop-loss per position: −15% from entry (configurable)
- Max drawdown circuit breaker: −30% from peak (pauses execution)
- Minimum cash reserve: $10
- Earnings blackout: 2 days before earnings (skip new entries)

---

## 9. State & Outputs

Portfolio state (serialized):
- holdings: {ticker → {shares, avg_cost, current_price, entry_date, entry_score}}
- cash, total_value, peak_value

Analysis state:
- watchlist, shortlist, scores, last_run timestamp

Execution output (trade-plan JSON):
- `generated_at`, `objective`, `portfolio_value`, `recommendation` (HOLD|ROTATE), `rotation` (sell/buy objects), `score_improvement`, `position_size_pct`, `post_trade_cash`, `reasoning_trace`

Trade-plan JSON schema (partial):
```json
{
  "generated_at": "ISO8601",
  "objective": "MAXIMIZE_RETURN",
  "portfolio_value": 12345.67,
  "recommendation": "ROTATE",
  "rotation": {
    "sell": {"ticker":"MSFT","shares":2,"price":420.0,"proceeds":840.0,"current_score":0.45},
    "buy": {"ticker":"SMCI","shares":3,"price":275.0,"cost":825.0,"expected_score":0.82}
  },
  "score_improvement": 0.37,
  "position_size_pct": 0.82,
  "post_trade_cash": 15.0,
  "reasoning_trace": [{"stage":"SCANNER","notes":"..."}]
}
```

Performance report fields must include starting capital, current value, total_return_pct, days_elapsed, max_drawdown_pct, win_rate_pct, profit_factor, sharpe_ratio.

---

## 10. Reasoning Trace (format)

The `reasoning_trace` is an ordered list of structured entries. Each entry should include:
- `stage`: SCANNER|SCORER|COMPARATOR|SIZER|EXECUTOR
- `ticker`: optional
- `payload`: stage-specific structured data (signals, component values, rank)
- `timestamp`

Example (compact):
```
[{"stage":"SCANNER","ticker":"SMCI","payload":{"signals":[{"type":"ANALYST_UPGRADE","weight":0.25}]},"timestamp":"..."}, ...]
```

---

## 11. Validation & Backtest Plan

Backtest datasets:
- 2023–2024 full-market history (daily bars) as primary validation period
- Additional scenarios: 2018 correction period, 2020 COVID drawdown, sideways period (2019)

Validation metrics (targets):
- annual_return > 50%
- sharpe_ratio > 1.5
- max_drawdown < 35%
- win_rate > 55%
- profit_factor > 2.0

Testing approach:
- unit tests for indicators and scoring components
- integration tests for rotation decisions
- reproducible backtest runs with seed and deterministic fills

---

## 12. Acceptance Criteria (testable)

AC-1: Scoring correctness — unit tests validate catalyst_strength, momentum_acceleration, upside_potential, and timing_factor produce expected numeric ranges and behavior.

AC-2: Rotation threshold — integration test verifies a rotation is queued when candidate.score − holding.score > 0.02 and not queued when ≤ 0.02.

AC-3: Position sizing — unit tests confirm `position_size_pct` follows 0.50 + score×0.40 and is clipped at 0.90.

AC-4: Risk enforcement — simulated P&L scenarios trigger stop-loss (−15%) and circuit-breaker (−30%) and log those events.

AC-5: Output schema — trade-plan JSON includes `reasoning_trace` and matches the schema; contract tests validate required fields.

AC-6: Backtest targets — backtests on 2023–2024 meet or make measurable progress toward the validation metrics; results stored as reproducible artifacts.

AC-7: CLI & reproducibility — `analyze`, `trade`, `dashboard` commands run (with mock mode) and produce deterministic outputs with a fixed seed.

---

## 13. Implementation Roadmap (MVP)

- Week 1: Indicators + Market Data + Mock data harness
- Week 2: Scanner + Scorer + Unit tests
- Week 3: Portfolio model + PositionSizer + RotationEngine + Integration tests
- Week 4: CLI, reasoning_trace integration, backtest runs, and reporting

---

## 14. Next Steps (I can do now)

1. Convert the Acceptance Criteria into test stubs (unit/integration) and add them to `src/tests/` — confirm and I will create test files.
2. Wire real market data (`yahoo-finance2`) behind the `MarketData` abstraction and add configuration for API/time-range.
3. Implement LangChain.js optional reasoning trace enrichment (LLM calls behind a toggle, cached).

If you want, I will now commit this updated PRD into `docs/specs/prd.md` (done), and proceed to create the AC test stubs (option 1), or instead implement the scoreboard tests (option 2). Which should I do next?