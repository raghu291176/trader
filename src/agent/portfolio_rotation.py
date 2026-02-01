"""Main Portfolio Rotation Agent orchestrator."""

from datetime import datetime
from typing import Dict, Optional, List
import json
from pathlib import Path

from src.data.market_data import MarketDataFetcher
from src.data.watchlist import WatchlistManager
from src.agent.scanner import Scanner
from src.agent.scorer import Scorer
from src.agent.position_sizer import PositionSizer
from src.agent.rotation_engine import RotationEngine
from src.models.portfolio import Portfolio
from src.utils.formatting import TradeFormatter, PerformanceFormatter
from src.utils.performance import PerformanceTracker


class PortfolioRotationAgent:
    """Main orchestrator for portfolio rotation strategy."""
    
    def __init__(
        self,
        initial_capital: float = 10000.0,
        watchlist_file: Optional[Path] = None,
        cache_hours: int = 1,
    ):
        """
        Initialize the agent.
        
        Args:
            initial_capital: Starting capital in dollars
            watchlist_file: Path to custom watchlist JSON
            cache_hours: Market data cache validity
        """
        self.initial_capital = initial_capital
        self.portfolio = Portfolio(initial_capital)
        
        # Initialize components
        self.data_fetcher = MarketDataFetcher(cache_hours=cache_hours)
        self.watchlist_manager = WatchlistManager(watchlist_file=watchlist_file)
        self.scanner = Scanner()
        self.scorer = Scorer()
        self.position_sizer = PositionSizer()
        self.rotation_engine = RotationEngine()
        self.performance_tracker = PerformanceTracker()
    
    def run(
        self,
        dry_run: bool = True,
        max_position_value: Optional[float] = None,
    ) -> Dict:
        """
        Execute main agent loop:
        1. Fetch market data
        2. Score all watchlist candidates
        3. Evaluate rotations
        4. Execute best rotation (if qualified)
        5. Return trade plan and performance
        
        Args:
            dry_run: If True, don't execute trades (analysis only)
            max_position_value: Override max position value
        
        Returns:
            Dictionary with trade plan and performance data
        """
        tickers = self.watchlist_manager.get_tickers()
        
        # Fetch market data
        print(f"[AGENT] Fetching market data for {len(tickers)} tickers...")
        price_data = self.data_fetcher.get_batch_data(tickers, period="1y")
        prices = self.data_fetcher.get_batch_current_prices(tickers)
        
        if not prices:
            return {"error": "Failed to fetch market data", "recommendation": "HOLD"}
        
        # Update portfolio prices
        self.portfolio.update_prices(prices)
        
        # Score all watchlist candidates
        print("[AGENT] Scoring watchlist candidates...")
        watchlist_scores = self._score_watchlist(tickers, price_data)
        
        # Evaluate rotations
        print("[AGENT] Evaluating rotations...")
        rotation = self.rotation_engine.get_best_rotation(
            self.portfolio,
            watchlist_scores,
            prices,
        )
        
        # Prepare response
        recommendation = "HOLD"
        rotation_data = None
        expected_improvement = None
        position_size = None
        
        if rotation and self.rotation_engine.should_execute_rotation(self.portfolio):
            sell_ticker, buy_ticker, gain, reason = rotation
            sell_pos = self.portfolio.get_position(sell_ticker)
            buy_score = watchlist_scores[buy_ticker]
            
            if not dry_run:
                print(f"[AGENT] Executing rotation: {sell_ticker} → {buy_ticker}")
                success, error = self.rotation_engine.execute_rotation(
                    self.portfolio,
                    sell_ticker,
                    buy_ticker,
                    prices,
                    buy_score,
                    reason=reason,
                )
                
                if success:
                    recommendation = "ROTATE"
                    # Record performance snapshot
                    self.performance_tracker.record_snapshot(
                        datetime.now(),
                        self.portfolio.portfolio_value,
                        self.portfolio.cash,
                        self.portfolio.holdings_value,
                        self.portfolio.num_positions,
                    )
                else:
                    print(f"[AGENT] Rotation failed: {error}")
                    recommendation = "HOLD"
            else:
                recommendation = "ROTATE"
                buy_pos = self.portfolio.positions.get(buy_ticker)
                shares_to_buy = self.position_sizer.calculate_shares(
                    self.portfolio.portfolio_value,
                    self.position_sizer.calculate_size(buy_score),
                    prices[buy_ticker],
                )
                
                if sell_pos and shares_to_buy > 0:
                    rotation_data = TradeFormatter.format_rotation(
                        sell_ticker=sell_ticker,
                        sell_shares=sell_pos.shares,
                        sell_price=prices[sell_ticker],
                        sell_score=sell_pos.current_score or 0.0,
                        sell_reason="Score improvement available",
                        buy_ticker=buy_ticker,
                        buy_shares=shares_to_buy,
                        buy_price=prices[buy_ticker],
                        buy_score=buy_score,
                        catalysts=self._get_catalysts_for_ticker(buy_ticker, price_data.get(buy_ticker)),
                        upside_potential=f"+{(watchlist_scores.get(buy_ticker, 0) * 25):.1f}%",
                    )
                    expected_improvement = f"+{gain:.4f} score differential"
                    position_size = f"{self.position_sizer.calculate_size(buy_score) * 100:.0f}% of portfolio"
        
        # Format output
        trade_plan = TradeFormatter.format_trade_plan(
            self.portfolio,
            recommendation,
            rotation=rotation_data,
            expected_improvement=expected_improvement,
            position_size=position_size,
        )
        
        dashboard = PerformanceFormatter.format_dashboard(self.portfolio)
        
        return {
            "trade_plan": trade_plan,
            "performance": dashboard,
            "portfolio_state": self.portfolio.to_dict(),
            "watchlist_scores": {k: round(v, 4) for k, v in watchlist_scores.items()},
            "prices": prices,
        }
    
    def _score_watchlist(self, tickers: List[str], price_data: Dict) -> Dict[str, float]:
        """
        Score all tickers in watchlist.
        
        Args:
            tickers: List of tickers
            price_data: Dictionary mapping ticker → DataFrame
        
        Returns:
            Dictionary mapping ticker → score
        """
        scores = {}
        
        for ticker in tickers:
            if ticker not in price_data:
                scores[ticker] = 0.0
                continue
            
            data = price_data[ticker]
            if len(data) < 2:
                scores[ticker] = 0.0
                continue
            
            # Detect catalysts
            catalysts = self.scanner.detect_catalysts(ticker, data)
            catalyst_strength = self.scanner.calculate_catalyst_strength(catalysts)
            
            # Calculate upside (mock: random between 0-0.5)
            current_price = data["Close"].iloc[-1]
            # For real implementation, fetch analyst targets
            upside_potential = min(0.3, catalyst_strength * 0.5)
            
            # Score
            score = self.scorer.score(
                ticker=ticker,
                price_data=data,
                catalyst_strength=catalyst_strength,
                upside_potential=upside_potential,
            )
            
            scores[ticker] = score
        
        return scores
    
    def _get_catalysts_for_ticker(self, ticker: str, price_data) -> List[str]:
        """Get catalyst descriptions for a ticker."""
        if price_data is None or len(price_data) < 2:
            return []
        
        catalysts = self.scanner.detect_catalysts(ticker, price_data)
        
        catalyst_map = {
            "analyst_upgrade": "Analyst upgrade with ≥15% upside",
            "earnings_surprise": "Earnings surprise > +10%",
            "rsi_crossover_above_50": "RSI breakout above 50",
            "macd_bullish_crossover": "MACD bullish crossover",
            "volume_surge": "Volume 3.2x average",
            "news_sentiment_spike": "News sentiment spike (>0.7)",
            "sector_rotation_inflow": "Sector rotation inflow",
        }
        
        return [catalyst_map.get(name, name) for name, _ in catalysts]
