# Portfolio Rotation Agent

Return-maximization trading agent with LangChain-powered reasoning traces.

## Overview

This agent implements the portfolio rotation strategy (spec: `docs/specs/features/portfolio-rotation-agent.md`) by:

1. **Signal Detection**: Scanning for bullish catalysts (analyst upgrades, earnings surprises, momentum signals)
2. **Scoring**: Calculating expected return scores using technical indicators
3. **Position Sizing**: Using Kelly-inspired formulas to size positions proportional to conviction
4. **Rotation**: Aggressively rotating into higher-conviction opportunities
5. **Risk Control**: Enforcing circuit breakers to prevent catastrophic loss

## Architecture

### Core Components

```
src/
├── agent/
│   ├── scanner.py              # Catalyst detection
│   ├── scorer.py               # Expected return scoring
│   ├── position_sizer.py       # Kelly-inspired sizing
│   ├── rotation_engine.py      # Rotation decision logic
│   ├── portfolio_rotation.py   # Main orchestrator
│   └── langchain_agent.py      # LangChain reasoning traces
├── models/
│   ├── portfolio.py            # Portfolio state
│   ├── position.py             # Individual positions
│   └── trade.py                # Trade records
├── data/
│   ├── market_data.py          # Yahoo Finance integration
│   └── watchlist.py            # Ticker watchlist management
└── utils/
    ├── indicators.py           # Technical indicators (RSI, MACD, Volume)
    ├── formatting.py           # JSON output formatting
    └── performance.py          # Performance tracking
```

### LangChain Integration

When `--reasoning` flag is used, the agent generates detailed reasoning traces per spec Section 11:

```
[SCANNER] Evaluating SMCI
  → Catalyst: Analyst upgrade, target +27% [weight: 0.25]
  → Catalyst: Volume 3.2x average [weight: 0.10]
  → Catalyst: RSI crossed 50 [weight: 0.15]
  → Total catalyst_strength: 0.50

[SCORER] Calculating SMCI expected return
  → Catalyst strength: 0.50
  → Momentum acceleration: +0.35
  → Upside potential: 0.27
  → Timing factor: +0.50
  → Expected return score: 0.82

[COMPARATOR] Return optimization check
  → Current holding: MSFT (score 0.45, upside 8%)
  → Candidate: SMCI (score 0.82, upside 27%)
  → Rotation gain: +0.37
  → Decision: ROTATE

[POSITION_SIZER] Kelly-inspired allocation
  → Confidence: 0.82
  → Recommended position: 82% of portfolio
```

## Quick Start

### 1. Installation

```bash
# Clone or navigate to project
cd /Users/raghubalachandran/projects/trader

# Create Python environment
python3.12 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy `.env.template` to `.env` and customize:

```bash
cp .env.template .env
```

For LangChain reasoning (optional):
```bash
# Edit .env
OPENAI_API_KEY=sk-your-key-here
USE_LLM=true
LLM_MODEL=gpt-4
```

### 3. Run the Agent

**Dry-run analysis (no trades executed):**
```bash
python main.py --mode analyze --capital 10000
```

**With reasoning traces:**
```bash
python main.py --mode analyze --reasoning
```

**With LLM-powered reasoning (requires OPENAI_API_KEY):**
```bash
python main.py --mode analyze --reasoning --llm
```

**Paper trading (executes trades):**
```bash
python main.py --mode trade --capital 10000 --output results.json
```

## Output Format

### Trade Plan

```json
{
  "generated_at": "2025-01-31T14:23:45.123456",
  "objective": "MAXIMIZE_RETURN",
  "portfolio_value": 10500.00,
  "total_return_pct": 5.00,
  "annualized_return_pct": 250.0,
  "recommendation": "ROTATE",
  "rotation": {
    "sell": {
      "ticker": "MSFT",
      "shares": 10,
      "price": 420.00,
      "proceeds": 4200.00,
      "current_score": 0.45
    },
    "buy": {
      "ticker": "SMCI",
      "shares": 15,
      "price": 275.00,
      "cost": 4125.00,
      "expected_score": 0.82,
      "catalysts": ["Analyst upgrade: +27%", "Volume 3.2x", "RSI breakout"],
      "upside_potential": "27%"
    }
  },
  "expected_improvement": "+0.37 score differential",
  "position_size": "82% of portfolio",
  "post_trade_cash": 75.00
}
```

### Performance Dashboard

```json
{
  "performance": {
    "starting_capital": 10000.00,
    "current_value": 10500.00,
    "total_return": "+5.00%",
    "days_elapsed": 5,
    "daily_compound_rate": "+0.98%",
    "annualized_rate": "+250%",
    "sharpe_ratio": 2.4,
    "max_drawdown": "-8.2%",
    "win_rate": "67%",
    "avg_winner": "+9.2%",
    "avg_loser": "-4.1%",
    "profit_factor": 3.01,
    "total_rotations": 2
  }
}
```

## Strategy Parameters

All parameters configurable via environment variables or CLI arguments:

| Parameter | Default | Purpose |
|-----------|---------|---------|
| `INITIAL_CAPITAL` | $10,000 | Starting portfolio value |
| `ROTATION_THRESHOLD` | 0.02 | Minimum score differential to rotate (vs 0.30 for conservative) |
| `STOP_LOSS_PCT` | -15% | Stop-loss per position |
| `MAX_DRAWDOWN_PCT` | -30% | Circuit breaker: max drawdown before pause |
| `MIN_CASH` | $10 | Minimum cash maintained for next trade |
| `CACHE_HOURS` | 1 | Market data cache validity |

## Technical Indicators

### RSI (Relative Strength Index)
- Period: 14 days
- Used to detect: Momentum entry (crossing 50), overbought (>75)
- Entry signal: RSI crosses above 50 from below (+0.15 weight)

### MACD (Moving Average Convergence Divergence)
- Fast EMA: 12 days
- Slow EMA: 26 days
- Signal: 9 days
- Used to detect: Bullish/bearish crossovers, histogram momentum
- Entry signal: MACD line > signal line (+0.15 weight)

### Volume Ratio
- Calculated: Current volume / 20-day average
- Entry signal: Ratio > 2.0 (+0.10 weight)

## Risk Controls

Per specification, minimal constraints for ruin prevention:

1. **Stop-Loss**: -15% per position (auto-exit)
2. **Max Drawdown**: -30% from peak (force pause, reassess)
3. **Minimum Cash**: $10 maintained for next trade (prevent illiquidity)
4. **Earnings Blackout**: Skip entries 2 days before earnings (avoid binary gambles)

## Scoring Formula

```
expected_return_score = 
    (catalyst_strength × 0.40) +
    (momentum_acceleration × 0.30) +
    (upside_potential × 0.20) +
    (timing_factor × 0.10)
```

Catalyst weights (sum normalized to 1.0):
- Analyst upgrade (≥15% target): 0.25
- Earnings surprise (>+10%): 0.20
- RSI cross above 50: 0.15
- MACD bullish cross: 0.15
- Volume surge (>2x): 0.10
- News sentiment (>0.7): 0.10
- Sector rotation inflow: 0.05

## Position Sizing (Kelly-Inspired)

```
position_size = min(
    base_allocation (50%) + (score × 0.40),
    hard_cap (90%)
)
```

Example: Score 0.82 → Position size 82% of portfolio
- No arbitrary diversification that dilutes returns
- Concentrates capital in highest-conviction opportunities

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=term-plus

# Run specific test
pytest tests/test_scorer.py -v
```

Unit tests included for:
- Technical indicators (RSI, MACD, volume)
- Scoring calculations
- Position sizing (Kelly formula)
- Portfolio state management
- Rotation logic

## Backtesting

Validate strategy against historical data:

```bash
python backtest.py --start 2023-01-01 --end 2024-12-31 --capital 10000
```

Backtesting requirements (per spec):
- Annual return: >50%
- Sharpe ratio: >1.5
- Max drawdown: <35%
- Win rate: >55%
- Profit factor: >2.0

## Reasoning Traces (LangChain)

When `--reasoning` is used, detailed decision traces are generated:

```
[SCANNER] Evaluating SMCI
  → Triggered catalysts: 3
  → Catalyst strength: 0.50

[SCORER] Calculating SMCI expected return
  → Catalyst strength: 0.50
  → Momentum acceleration: +0.35
  → Upside potential: 0.27
  → Timing factor: +0.50
  → Expected return score: 0.82

[POSITION_SIZER] Kelly-inspired allocation
  → Confidence: 0.82
  → Position size: 82% of portfolio
```

This implements spec Section 11 (Reasoning Trace) and enables:
- Explainability of every decision
- Debug and optimization of agent behavior
- Compliance and audit trails
- Research and backtesting

## Project Constitution

See `docs/specs/constitution.md` for:
- Core tenets (return maximization, rapid rotation, momentum capture)
- Technology stack (Python, LangChain, pandas, pytest)
- Quality standards (85% test coverage, <5s runtime, >50% annual return)
- Development workflow (spec-first, test-driven, continuous backtesting)

## References

- **Specification**: `docs/specs/features/portfolio-rotation-agent.md`
- **Implementation Plan**: `docs/specs/plans/portfolio-rotation-implementation.md`
- **Constitution**: `docs/specs/constitution.md`
