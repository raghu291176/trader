"""Portfolio state management and tracking."""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
import json
from src.models.position import Position
from src.models.trade import Trade, TradeType


class Portfolio:
    """Manages portfolio state, positions, and performance tracking."""
    
    def __init__(self, initial_capital: float):
        """
        Initialize portfolio.
        
        Args:
            initial_capital: Starting capital in dollars
        """
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self.peak_value = initial_capital
        self.created_at = datetime.now()
    
    @property
    def portfolio_value(self) -> float:
        """Calculate total portfolio value (cash + holdings)."""
        holdings_value = sum(pos.current_value for pos in self.positions.values())
        return self.cash + holdings_value
    
    @property
    def holdings_value(self) -> float:
        """Calculate total value of all holdings."""
        return sum(pos.current_value for pos in self.positions.values())
    
    @property
    def total_return_pct(self) -> float:
        """Calculate total return as percentage."""
        if self.initial_capital == 0:
            return 0.0
        return ((self.portfolio_value - self.initial_capital) / self.initial_capital) * 100
    
    @property
    def unrealized_pnl(self) -> float:
        """Calculate total unrealized P&L."""
        return sum(pos.unrealized_pnl for pos in self.positions.values())
    
    @property
    def realized_pnl(self) -> float:
        """Calculate realized P&L from closed positions."""
        return self.portfolio_value - self.initial_capital - self.unrealized_pnl
    
    @property
    def max_drawdown_pct(self) -> float:
        """Calculate maximum drawdown from peak as percentage."""
        if self.peak_value == 0:
            return 0.0
        return ((self.portfolio_value - self.peak_value) / self.peak_value) * 100
    
    @property
    def num_positions(self) -> int:
        """Return number of open positions."""
        return len(self.positions)
    
    @property
    def cash_pct(self) -> float:
        """Return cash as percentage of portfolio."""
        if self.portfolio_value == 0:
            return 0.0
        return (self.cash / self.portfolio_value) * 100
    
    @property
    def leverage(self) -> float:
        """Return portfolio leverage ratio."""
        if self.cash <= 0:
            return 0.0
        return self.portfolio_value / self.initial_capital
    
    def add_position(
        self,
        ticker: str,
        shares: int,
        price: float,
        score: float,
        reason: str = "",
    ) -> bool:
        """
        Add a new position or increase existing position.
        
        Args:
            ticker: Stock ticker symbol
            shares: Number of shares to buy
            price: Purchase price per share
            score: Expected return score
            reason: Trade reason
        
        Returns:
            True if successful, False if insufficient cash
        """
        cost = shares * price
        if cost > self.cash:
            return False
        
        # Create or update position
        if ticker in self.positions:
            pos = self.positions[ticker]
            pos.shares += shares
            pos.current_price = price
            pos.current_score = score
        else:
            pos = Position(
                ticker=ticker,
                shares=shares,
                entry_price=price,
                entry_score=score,
                current_price=price,
                current_score=score,
            )
            self.positions[ticker] = pos
        
        # Update cash and record trade
        self.cash -= cost
        trade = Trade(
            ticker=ticker,
            trade_type=TradeType.BUY,
            shares=shares,
            price=price,
            score=score,
            reason=reason,
        )
        self.trades.append(trade)
        
        # Update peak
        if self.portfolio_value > self.peak_value:
            self.peak_value = self.portfolio_value
        
        return True
    
    def remove_position(
        self,
        ticker: str,
        price: float,
        reason: str = "",
    ) -> Tuple[bool, float]:
        """
        Close a position.
        
        Args:
            ticker: Stock ticker symbol
            price: Sale price per share
            reason: Trade reason
        
        Returns:
            Tuple of (success: bool, proceeds: float)
        """
        if ticker not in self.positions:
            return False, 0.0
        
        pos = self.positions[ticker]
        proceeds = pos.shares * price
        
        # Record trade
        trade = Trade(
            ticker=ticker,
            trade_type=TradeType.SELL,
            shares=pos.shares,
            price=price,
            score=pos.current_score or 0.0,
            reason=reason,
        )
        self.trades.append(trade)
        
        # Update cash and remove position
        self.cash += proceeds
        del self.positions[ticker]
        
        # Update peak
        if self.portfolio_value > self.peak_value:
            self.peak_value = self.portfolio_value
        
        return True, proceeds
    
    def rotate_position(
        self,
        sell_ticker: str,
        buy_ticker: str,
        sell_price: float,
        buy_price: float,
        new_score: float,
        reason: str = "",
    ) -> bool:
        """
        Rotate from one position to another.
        
        Args:
            sell_ticker: Ticker to sell
            buy_ticker: Ticker to buy
            sell_price: Sale price per share
            buy_price: Purchase price per share
            new_score: Score of new position
            reason: Trade reason
        
        Returns:
            True if successful
        """
        if sell_ticker not in self.positions:
            return False
        
        pos = self.positions[sell_ticker]
        proceeds = pos.shares * sell_price
        shares_to_buy = int(proceeds / buy_price)
        
        if shares_to_buy == 0:
            return False
        
        # Close old position
        success, _ = self.remove_position(sell_ticker, sell_price, reason)
        if not success:
            return False
        
        # Open new position
        success = self.add_position(buy_ticker, shares_to_buy, buy_price, new_score, reason)
        return success
    
    def update_prices(self, price_dict: Dict[str, float]) -> None:
        """
        Update current prices for all positions.
        
        Args:
            price_dict: Dictionary mapping ticker → current price
        """
        for ticker, price in price_dict.items():
            if ticker in self.positions:
                self.positions[ticker].update_price(price)
        
        # Update peak
        if self.portfolio_value > self.peak_value:
            self.peak_value = self.portfolio_value
    
    def check_stop_losses(self) -> List[str]:
        """
        Check which positions hit their stop-loss (-15%).
        
        Returns:
            List of tickers that hit stop-loss
        """
        stopped_out = []
        for ticker, pos in self.positions.items():
            if pos.is_stop_loss_hit:
                stopped_out.append(ticker)
        
        return stopped_out
    
    def get_position(self, ticker: str) -> Optional[Position]:
        """Get a specific position."""
        return self.positions.get(ticker)
    
    def get_all_positions(self) -> List[Position]:
        """Get all open positions."""
        return list(self.positions.values())
    
    def get_trade_history(self) -> List[Trade]:
        """Get trade history."""
        return self.trades
    
    def to_dict(self) -> dict:
        """Convert portfolio state to dictionary."""
        return {
            "created_at": self.created_at.isoformat(),
            "initial_capital": round(self.initial_capital, 2),
            "current_value": round(self.portfolio_value, 2),
            "cash": round(self.cash, 2),
            "holdings_value": round(self.holdings_value, 2),
            "total_return_pct": round(self.total_return_pct, 2),
            "unrealized_pnl": round(self.unrealized_pnl, 2),
            "realized_pnl": round(self.realized_pnl, 2),
            "peak_value": round(self.peak_value, 2),
            "max_drawdown_pct": round(self.max_drawdown_pct, 2),
            "num_positions": self.num_positions,
            "cash_pct": round(self.cash_pct, 2),
            "leverage": round(self.leverage, 4),
            "positions": [pos.to_dict() for pos in self.get_all_positions()],
            "trade_count": len(self.trades),
        }
