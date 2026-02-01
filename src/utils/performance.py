"""Performance tracking and analytics."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pandas as pd


class PerformanceTracker:
    """Track portfolio performance metrics over time."""
    
    def __init__(self):
        """Initialize performance tracker."""
        self.snapshots: List[Dict] = []
        self.daily_returns: List[float] = []
    
    def record_snapshot(
        self,
        timestamp: datetime,
        portfolio_value: float,
        cash: float,
        holdings_value: float,
        num_positions: int,
    ) -> None:
        """
        Record a portfolio snapshot.
        
        Args:
            timestamp: Snapshot timestamp
            portfolio_value: Total portfolio value
            cash: Cash balance
            holdings_value: Value of all holdings
            num_positions: Number of open positions
        """
        snapshot = {
            "timestamp": timestamp,
            "portfolio_value": portfolio_value,
            "cash": cash,
            "holdings_value": holdings_value,
            "num_positions": num_positions,
        }
        self.snapshots.append(snapshot)
    
    def record_daily_return(self, return_pct: float) -> None:
        """
        Record a daily return.
        
        Args:
            return_pct: Daily return as percentage (e.g., 2.5 for +2.5%)
        """
        self.daily_returns.append(return_pct)
    
    def get_statistics(self) -> Dict:
        """
        Calculate performance statistics.
        
        Returns:
            Dictionary with statistics
        """
        if not self.daily_returns:
            return {}
        
        returns_series = pd.Series(self.daily_returns)
        
        return {
            "total_days": len(self.daily_returns),
            "avg_daily_return": returns_series.mean(),
            "std_daily_return": returns_series.std(),
            "max_daily_return": returns_series.max(),
            "min_daily_return": returns_series.min(),
            "positive_days": (returns_series > 0).sum(),
            "negative_days": (returns_series < 0).sum(),
            "win_rate_daily": (returns_series > 0).sum() / len(returns_series) * 100 if len(returns_series) > 0 else 0,
        }
