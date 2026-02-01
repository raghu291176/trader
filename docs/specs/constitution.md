# Project Constitution

> Project-specific principles and standards.

## About This File

This is your project's constitution. Customize it to define:
- Project-specific development principles
- Technology choices and constraints
- Quality standards and requirements
- Team conventions

## Reference

This project uses ai-standards for governance. See:
- Global standards: `.ai-standards/constitution.md`
- Spec templates: `.ai-standards/.specify/`
- Available agents: `.ai-standards/agents/`

## Project Principles

### Core Tenets
- **Return Maximization**: Every dollar in a suboptimal position is opportunity cost
- **Rapid Rotation**: No loyalty to holdings; rotate immediately when better opportunities exist
- **Momentum Capture**: Entry on early signals, exit before reversal
- **Risk Management**: Accept volatility for growth, but enforce ruin-prevention circuit breakers
- **Data-Driven**: All decisions backed by technical indicators and catalyst analysis

### Technology Stack

- **Language**: Python 3.12
- **Framework**: LangChain 0.1.x (for reasoning traces, agent orchestration)
- **Market Data**: yfinance (real-time pricing)
- **Data Processing**: pandas, numpy
- **Testing**: pytest (>85% coverage target)
- **Portfolio Model**: In-memory state with JSON persistence

### Quality Standards

- **Test Coverage**: >85% for core modules (scorer, sizer, rotation_engine)
- **Performance**: Agent runs in <5 seconds for 50-ticker watchlist
- **Accuracy**: Technical indicators validated against TradingView/manual calculations
- **Backtesting**: Strategy must exceed 50% annual return on 2023-2024 data

### Development Workflow

1. **Specify before implementing**: Use `/speckit.specify` for feature specs
2. **Design with reasoning traces**: LangChain agent explains every decision
3. **Test-driven development**: Unit tests for all scoring/sizing logic
4. **Validate on historical data**: Backtest before paper trading
5. **Monitor live performance**: Track rotation P&L and drawdowns

### LangChain Integration

- **AgentExecutor**: Orchestrates Scanner → Scorer → PositionSizer → RotationEngine
- **Reasoning Traces**: Each trade decision includes thought process (per spec Section 11)
- **Tool Definitions**: Scanner, Scorer, PositionSizer as discrete LangChain tools
- **Prompt Engineering**: System prompt emphasizes return maximization, not capital preservation
