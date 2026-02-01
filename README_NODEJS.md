# Portfolio Rotation Agent (Node.js/TypeScript)

Return-maximization trading agent with LangChain reasoning traces, spec-first development workflow.

## Quick Start

```bash
npm install
npm run build
npm run dev analyze --reasoning
```

## Features

- **Multi-Factor Scoring**: 40% catalyst + 30% momentum + 20% upside + 10% timing
- **Aggressive Rotation**: 2% score differential triggers immediate rotation
- **Kelly-Inspired Position Sizing**: 50% base + 40% score adjustment (10-90% cap)
- **Risk Controls**: -15% stop-loss per position, -30% circuit breaker portfolio-wide
- **Technical Indicators**: RSI, MACD, volume analysis
- **7 Catalyst Signals**: RSI oversold bounce, MACD crossover, volume spike, price near low, momentum, volatility, RSI overbought

## Architecture

```
src/
├── agent/                    # Core trading logic
│   ├── portfolio_rotation.ts # Main orchestrator
│   ├── scanner.ts           # Catalyst detection (7 signals)
│   ├── scorer.ts            # Expected return scoring (4-factor)
│   ├── position_sizer.ts    # Kelly formula implementation
│   └── rotation_engine.ts   # Rotation decisions & execution
├── models/                   # Data structures
│   ├── portfolio.ts         # Portfolio state management
│   ├── position.ts          # Individual position tracking
│   └── trade.ts             # Trade history records
├── data/                     # Data layer
│   ├── market_data.ts       # Yahoo Finance integration
│   └── watchlist.ts         # Watchlist management
├── utils/                    # Utilities
│   └── indicators.ts        # RSI, MACD, volume calculations
└── main.ts                  # CLI interface
```

## Spec Compliance

All code references to spec sections in docstrings:
- **Section 3**: Market data fetching (`src/data/market_data.ts`)
- **Section 4**: Technical indicators (`src/utils/indicators.ts`)
- **Section 5**: Catalyst detection & scoring (`src/agent/scanner.ts`, `src/agent/scorer.ts`)
- **Section 6**: Position sizing & tracking (`src/agent/position_sizer.ts`, `src/models/`)
- **Section 7**: Rotation logic (`src/agent/rotation_engine.ts`)
- **Section 8**: Agent workflow (`src/agent/portfolio_rotation.ts`)

## Commands

### Analyze Watchlist
```bash
npm run dev analyze --capital 10000 --reasoning
```
Returns: scores, rotation decisions, performance dashboard

### Execute Trades
```bash
npm run dev trade --capital 10000
```
Executes rotations and updates portfolio

### Dashboard
```bash
npm run dev dashboard --capital 10000
```
Shows performance metrics

## Configuration

Set in `.env`:
```
OPENAI_API_KEY=sk-...          # For LangChain reasoning (optional)
ROTATION_THRESHOLD=0.02         # Score differential for rotation
STOP_LOSS_PERCENT=-15          # Stop-loss trigger
MAX_DRAWDOWN=-30               # Circuit breaker
CAPITAL=10000                  # Starting capital
```

## Testing

```bash
npm test                        # Run all tests
npm run test:coverage          # Generate coverage report
```

**Target Coverage**: >85% for core modules

## Key Metrics

- **Annual Return Target**: >50% (per spec)
- **Sharpe Ratio Target**: >1.5 (per spec)
- **Max Drawdown Target**: <35% (per spec)
- **Win Rate Target**: >55% (per spec)
- **Execution Time**: <5 seconds for 50-ticker watchlist (per spec)

## Development Workflow

1. **Spec-First**: All features traced to `docs/specs/features/portfolio-rotation-agent.md`
2. **Test-Driven**: Write tests alongside implementation
3. **Incremental**: Implement in phases (indicators → scoring → sizing → rotation)
4. **Documented**: Code comments link to spec sections

## Acceptance Criteria

See `docs/specs/features/portfolio-rotation-agent.md` for 16 acceptance criteria covering:
- Technical indicator correctness
- Multi-factor scoring validation
- Position sizing bounds
- Rotation logic verification
- Risk control enforcement
- JSON output formatting
- CLI functionality
- Test coverage

## References

- **Specification**: `docs/specs/features/portfolio-rotation-agent.md`
- **Implementation Plan**: `docs/specs/plans/portfolio-rotation-implementation.md`
- **Constitution**: `docs/specs/constitution.md`
- **Agent Workflow**: `AGENTS.md`
