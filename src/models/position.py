"""Position representation and tracking."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Position:
    """Represents a single position in the portfolio."""
    
    ticker: str
    shares: int
    entry_price: float
    entry_score: float
    entry_date: datetime = field(default_factory=datetime.now)
    current_price: Optional[float] = None
    current_score: Optional[float] = None
    
    @property
    def entry_value(self) -> float:
        """Calculate entry position value."""
        return self.shares * self.entry_price
    
    @property
    def current_value(self) -> float:
        """Calculate current position value."""
        if self.current_price is None:
            return self.entry_value
        return self.shares * self.current_price
    
    @property
    def unrealized_pnl(self) -> float:
        """Calculate unrealized profit/loss."""
        return self.current_value - self.entry_value
    
    @property
    def unrealized_pnl_pct(self) -> float:
        """Calculate unrealized P&L as percentage."""
        if self.entry_value == 0:
            return 0.0
        return (self.unrealized_pnl / self.entry_value) * 100
    
    @property
    def is_stop_loss_hit(self) -> bool:
        """Check if position hit -15% stop loss."""
        return self.unrealized_pnl_pct <= -15.0
    
    def update_price(self, price: float, score: Optional[float] = None) -> None:
        """Update current price and optionally score."""
        self.current_price = price
        if score is not None:
            self.current_score = score
    
    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "ticker": self.ticker,
            "shares": self.shares,
            "entry_price": round(self.entry_price, 2),
            "entry_value": round(self.entry_value, 2),
            "entry_score": round(self.entry_score, 4),
            "entry_date": self.entry_date.isoformat(),
            "current_price": round(self.current_price or 0, 2),
            "current_value": round(self.current_value, 2),
            "current_score": round(self.current_score or 0, 4) if self.current_score else None,
            "unrealized_pnl": round(self.unrealized_pnl, 2),
            "unrealized_pnl_pct": round(self.unrealized_pnl_pct, 2),
        }
