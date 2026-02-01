# Feature: Portfolio Rotation Agent

## Objective
Maximize portfolio return over any measured period by aggressively rotating into the highest-momentum opportunities while maintaining sufficient risk controls to avoid catastrophic loss.

## Acceptance Criteria

### Core Functionality
- [ ] Agent detects bullish catalysts (analyst upgrades, earnings surprises, momentum signals)
- [ ] Agent scores all watchlist candidates using multi-factor expected return formula
- [ ] Agent rotates to higher-conviction opportunities when score differential > 0.02
- [ ] Agent sizes positions using Kelly-inspired formula (50-90% of portfolio)
- [ ] Agent enforces stop-loss (-15%) and max drawdown (-30%) circuit breakers

### Output Format
- [ ] Trade plan JSON output matches spec Section 8 format
- [ ] Performance dashboard JSON output matches spec Section 8 format
- [ ] Reasoning trace follows spec Section 11 format (SCANNER → SCORER → COMPARATOR → POSITION_SIZER)

### Performance Targets (Backtesting)
- [ ] Annual return > 50% on 2023-2024 data
- [ ] Sharpe ratio > 1.5
- [ ] Max drawdown < 35%
- [ ] Win rate > 55%
- [ ] Profit factor > 2.0

### Technical Requirements
- [ ] Agent runs in < 5 seconds for 50-ticker watchlist
- [ ] >85% test coverage for scorer, sizer, rotation_engine
- [ ] LangChain integration for reasoning traces
- [ ] Configurable via environment variables or CLI

---

## Design Decisions

### Core Philosophy
**Return maximization requires:**
1. Concentrating capital in highest-conviction positions (not diversifying away returns)
2. Rapid rotation when better opportunities emerge (no loyalty to holdings)
3. Capturing momentum early and exiting before reversal
4. Sizing positions proportional to expected edge (Kelly-inspired)
5. Accepting higher volatility as the cost of higher returns

### Signal Detection
Rank catalysts by historical correlation with short-term outperformance:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Analyst upgrade with ≥15% price target increase | 0.25 | Strong institutional conviction |
| Earnings surprise > +10% | 0.20 | Fundamental momentum |
| RSI crossing above 50 from below | 0.15 | Momentum ignition |
| MACD bullish crossover | 0.15 | Trend confirmation |
| Volume surge > 2x 20-day average | 0.10 | Institutional accumulation |
| News sentiment spike (>0.7) | 0.10 | Narrative momentum |
| Sector rotation inflow | 0.05 | Macro tailwind |

### Scoring Formula
```
expected_return_score = 
    (catalyst_strength × 0.40) +
    (momentum_acceleration × 0.30) +
    (upside_potential × 0.20) +
    (timing_factor × 0.10)
```

### Position Sizing (Kelly-Inspired)
```
position_size = min(
    base_allocation (50%) + (confidence × 0.40),
    hard_cap (90%)
)
```

### Rotation Threshold
- **Threshold**: Score differential > 0.02 (vs 0.30 for conservative approach)
- **Execution**: Highest rotation_gain pair executed first
- **Frequency**: No hold period; rotate immediately if better exists

### Risk Controls (Ruin Prevention Only)
| Control | Value | Purpose |
|---------|-------|---------|
| Stop-loss per position | -15% from entry | Prevent single-position wipeout |
| Maximum drawdown circuit breaker | -30% from peak | Force pause and reassess |
| Minimum cash for 1 trade | $10 | Ensure can always rotate |
| Earnings blackout | Skip entries 2 days before earnings | Avoid binary gambles |

---

## Implementation Notes

### Key Files
- `src/agent/scanner.py` — Catalyst detection
- `src/agent/scorer.py` — Expected return scoring
- `src/agent/position_sizer.py` — Kelly-inspired sizing
- `src/agent/rotation_engine.py` — Rotation logic
- `src/agent/portfolio_rotation.py` — Main orchestrator
- `src/agent/langchain_agent.py` — Reasoning traces
- `src/models/portfolio.py` — Portfolio state management
- `src/utils/indicators.py` — Technical indicators (RSI, MACD, Volume)

### Dependencies
- yfinance (market data)
- pandas, numpy (data processing)
- langchain (reasoning traces)
- pytest (testing)

### Testing Strategy
1. **Unit Tests**: Each component (scorer, sizer, rotation_engine)
2. **Integration Tests**: Full workflow with mock data
3. **Backtesting**: Historical validation (2023-2024)
4. **Edge Cases**: Insufficient cash, no rotations, circuit breaker triggers

---

## References

- **Specification Document**: This file
- **Implementation Plan**: `docs/specs/plans/portfolio-rotation-implementation.md`
- **Project Constitution**: `docs/specs/constitution.md`
- **Reasoning Trace Format**: Section 11 of this spec


