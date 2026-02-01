"""Trade representation."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class TradeType(Enum):
    """Trade type enumeration."""
    BUY = "BUY"
    SELL = "SELL"
    ROTATION = "ROTATION"


@dataclass
class Trade:
    """Represents a single trade execution."""
    
    ticker: str
    trade_type: TradeType
    shares: int
    price: float
    timestamp: datetime = field(default_factory=datetime.now)
    score: float = 0.0
    reason: str = ""
    commission: float = 0.0
    
    @property
    def trade_value(self) -> float:
        """Calculate total trade value."""
        return self.shares * self.price
    
    @property
    def total_cost(self) -> float:
        """Calculate total cost including commission."""
        return self.trade_value + (self.commission if self.trade_type == TradeType.BUY else -self.commission)
    
    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        return {
            "ticker": self.ticker,
            "type": self.trade_type.value,
            "shares": self.shares,
            "price": round(self.price, 2),
            "value": round(self.trade_value, 2),
            "commission": round(self.commission, 2),
            "total_cost": round(self.total_cost, 2),
            "score": round(self.score, 4),
            "reason": self.reason,
            "timestamp": self.timestamp.isoformat(),
        }
