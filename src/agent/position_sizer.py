"""Position sizing using Kelly Criterion."""

from typing import Tuple


class PositionSizer:
    """Calculate position sizes using Kelly-inspired formula."""
    
    def __init__(self):
        """Initialize position sizer."""
        self.base_allocation = 0.50  # Start at 50% of capital
        self.confidence_scaling = 0.40  # Scale 50-90% based on conviction
        self.max_position_pct = 0.90  # Hard cap at 90%
        self.min_position_pct = 0.10  # Soft minimum at 10%
    
    def calculate_size(self, score: float) -> float:
        """
        Calculate position size as percentage of portfolio.
        
        Formula:
        position_size = min(
            base_allocation + (confidence × confidence_scaling),
            max_position_pct
        )
        
        Args:
            score: Expected return score (0-1)
        
        Returns:
            Position size as fraction of portfolio (0.10-0.90)
        """
        if not 0 <= score <= 1:
            raise ValueError(f"Score must be between 0 and 1, got {score}")
        
        position_size = self.base_allocation + (score * self.confidence_scaling)
        position_size = min(position_size, self.max_position_pct)
        position_size = max(position_size, self.min_position_pct)
        
        return position_size
    
    def kelly_formula(
        self,
        win_rate: float,
        avg_win: float,
        avg_loss: float,
    ) -> Tuple[float, float, float]:
        """
        Calculate Kelly Criterion position sizing.
        
        Kelly formula:
        edge = (win_rate × avg_win) - (loss_rate × avg_loss)
        odds = avg_win / avg_loss
        position_size = edge / odds
        
        Args:
            win_rate: Historical win rate (0-1)
            avg_win: Average win as fraction (e.g., 0.08 for 8%)
            avg_loss: Average loss as fraction (e.g., 0.04 for 4%)
        
        Returns:
            Tuple of (edge, odds, kelly_position_size)
        """
        if not (0 <= win_rate <= 1):
            raise ValueError(f"Win rate must be 0-1, got {win_rate}")
        if avg_win <= 0 or avg_loss <= 0:
            raise ValueError("Average win and loss must be positive")
        
        loss_rate = 1 - win_rate
        edge = (win_rate * avg_win) - (loss_rate * avg_loss)
        odds = avg_win / avg_loss
        
        if odds == 0:
            kelly_size = 0
        else:
            kelly_size = edge / odds
        
        # Clamp to safe range (avoid overleverage)
        kelly_size = max(0, min(kelly_size, self.max_position_pct))
        
        return edge, odds, kelly_size
    
    def calculate_shares(
        self,
        portfolio_value: float,
        position_pct: float,
        share_price: float,
    ) -> int:
        """
        Calculate number of shares to buy.
        
        Args:
            portfolio_value: Total portfolio value
            position_pct: Position size as fraction (e.g., 0.82)
            share_price: Current share price
        
        Returns:
            Number of whole shares (rounded down)
        """
        position_value = portfolio_value * position_pct
        shares = int(position_value / share_price)  # Round down
        return max(0, shares)
