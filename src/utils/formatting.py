"""Output formatting for trade plans and performance dashboards."""

from datetime import datetime
import json
from typing import Optional, Dict, List
from src.models.portfolio import Portfolio


class TradeFormatter:
    """Format trade recommendations as JSON per specification."""
    
    @staticmethod
    def format_trade_plan(
        portfolio: Portfolio,
        recommendation: str,  # "ROTATE", "HOLD", "CIRCUIT_BREAKER"
        rotation: Optional[Dict] = None,
        expected_improvement: Optional[str] = None,
        position_size: Optional[str] = None,
    ) -> Dict:
        """
        Format trade plan per specification Section 8.
        
        Args:
            portfolio: Current portfolio state
            recommendation: Trade recommendation
            rotation: Rotation details or None
            expected_improvement: Expected score improvement
            position_size: Position sizing description
        
        Returns:
            Formatted JSON-serializable dictionary
        """
        return {
            "generated_at": datetime.now().isoformat(),
            "objective": "MAXIMIZE_RETURN",
            "portfolio_value": round(portfolio.portfolio_value, 2),
            "total_return_pct": round(portfolio.total_return_pct, 2),
            "annualized_return_pct": round(
                TradeFormatter._calculate_annualized_return(portfolio),
                2
            ),
            "recommendation": recommendation,
            "rotation": rotation,
            "expected_improvement": expected_improvement,
            "position_size": position_size,
            "post_trade_cash": round(portfolio.cash, 2),
        }
    
    @staticmethod
    def format_rotation(
        sell_ticker: str,
        sell_shares: int,
        sell_price: float,
        sell_score: float,
        sell_reason: str,
        buy_ticker: str,
        buy_shares: int,
        buy_price: float,
        buy_score: float,
        catalysts: List[str],
        upside_potential: str,
    ) -> Dict:
        """
        Format rotation details.
        
        Args:
            sell_ticker: Ticker being sold
            sell_shares: Shares being sold
            sell_price: Sale price
            sell_score: Current score
            sell_reason: Reason for selling
            buy_ticker: Ticker being bought
            buy_shares: Shares being bought
            buy_price: Purchase price
            buy_score: Expected score
            catalysts: List of triggered catalysts
            upside_potential: Upside percentage as string
        
        Returns:
            Formatted rotation dictionary
        """
        sell_proceeds = sell_shares * sell_price
        buy_cost = buy_shares * buy_price
        
        return {
            "sell": {
                "ticker": sell_ticker,
                "shares": sell_shares,
                "price": round(sell_price, 2),
                "proceeds": round(sell_proceeds, 2),
                "current_score": round(sell_score, 4),
                "reason": sell_reason,
            },
            "buy": {
                "ticker": buy_ticker,
                "shares": buy_shares,
                "price": round(buy_price, 2),
                "cost": round(buy_cost, 2),
                "expected_score": round(buy_score, 4),
                "catalysts": catalysts,
                "upside_potential": upside_potential,
            },
        }
    
    @staticmethod
    def _calculate_annualized_return(portfolio: Portfolio) -> float:
        """Calculate annualized return."""
        if portfolio.initial_capital == 0:
            return 0.0
        
        elapsed_days = (datetime.now() - portfolio.created_at).days
        if elapsed_days < 1:
            return 0.0
        
        # Compound return: (current / initial) ^ (365 / days) - 1
        total_return = portfolio.portfolio_value / portfolio.initial_capital
        annualized = (total_return ** (365 / elapsed_days) - 1) * 100
        
        return annualized


class PerformanceFormatter:
    """Format performance dashboard as JSON per specification."""
    
    @staticmethod
    def format_dashboard(
        portfolio: Portfolio,
        trades_by_ticker: Optional[Dict[str, List]] = None,
    ) -> Dict:
        """
        Format performance dashboard per specification Section 8.
        
        Args:
            portfolio: Current portfolio state
            trades_by_ticker: Optional breakdown of trades by ticker
        
        Returns:
            Formatted JSON-serializable dictionary
        """
        win_rate, avg_winner, avg_loser, profit_factor = PerformanceFormatter._calculate_trade_stats(
            portfolio
        )
        
        elapsed_days = (datetime.now() - portfolio.created_at).days
        daily_compound = PerformanceFormatter._calculate_daily_compound(portfolio)
        annualized_rate = PerformanceFormatter._calculate_annualized_return(portfolio)
        
        return {
            "performance": {
                "starting_capital": round(portfolio.initial_capital, 2),
                "current_value": round(portfolio.portfolio_value, 2),
                "total_return": f"+{portfolio.total_return_pct:.2f}%" if portfolio.total_return_pct >= 0 else f"{portfolio.total_return_pct:.2f}%",
                "days_elapsed": elapsed_days,
                "daily_compound_rate": f"+{daily_compound:.2f}%" if daily_compound >= 0 else f"{daily_compound:.2f}%",
                "annualized_rate": f"+{annualized_rate:.2f}%" if annualized_rate >= 0 else f"{annualized_rate:.2f}%",
                "sharpe_ratio": round(PerformanceFormatter._calculate_sharpe_ratio(portfolio), 2),
                "max_drawdown": f"{portfolio.max_drawdown_pct:.2f}%",
                "win_rate": f"{win_rate:.1f}%",
                "avg_winner": f"+{avg_winner:.2f}%" if avg_winner >= 0 else f"{avg_winner:.2f}%",
                "avg_loser": f"{avg_loser:.2f}%",
                "profit_factor": round(profit_factor, 2),
                "total_rotations": len([t for t in portfolio.trades if t.trade_type.value == "ROTATION"]),
            }
        }
    
    @staticmethod
    def _calculate_trade_stats(portfolio: Portfolio) -> tuple:
        """
        Calculate trade statistics: win_rate, avg_winner, avg_loser, profit_factor.
        
        Returns:
            Tuple of (win_rate_pct, avg_winner_pct, avg_loser_pct, profit_factor)
        """
        sells = [t for t in portfolio.trades if t.trade_type.value == "SELL"]
        
        if not sells:
            return 0.0, 0.0, 0.0, 0.0
        
        wins = []
        losses = []
        
        for sell_trade in sells:
            ticker = sell_trade.ticker
            # Find corresponding buy trade
            buys = [t for t in portfolio.trades if t.trade_type.value in ["BUY", "ROTATION"] and t.ticker == ticker]
            if buys:
                buy_price = buys[-1].price
                sell_price = sell_trade.price
                pnl_pct = ((sell_price - buy_price) / buy_price) * 100
                
                if pnl_pct >= 0:
                    wins.append(pnl_pct)
                else:
                    losses.append(pnl_pct)
        
        total_trades = len(wins) + len(losses)
        win_rate = (len(wins) / total_trades * 100) if total_trades > 0 else 0.0
        
        avg_winner = sum(wins) / len(wins) if wins else 0.0
        avg_loser = sum(losses) / len(losses) if losses else 0.0
        
        total_wins = sum(abs(w) for w in wins) if wins else 0.0
        total_losses = sum(abs(l) for l in losses) if losses else 1.0
        profit_factor = total_wins / total_losses if total_losses > 0 else 0.0
        
        return win_rate, avg_winner, avg_loser, profit_factor
    
    @staticmethod
    def _calculate_daily_compound(portfolio: Portfolio) -> float:
        """Calculate daily compound return rate."""
        if portfolio.initial_capital == 0:
            return 0.0
        
        elapsed_days = max((datetime.now() - portfolio.created_at).days, 1)
        
        total_return = portfolio.portfolio_value / portfolio.initial_capital
        daily_compound = ((total_return ** (1 / elapsed_days)) - 1) * 100
        
        return daily_compound
    
    @staticmethod
    def _calculate_annualized_return(portfolio: Portfolio) -> float:
        """Calculate annualized return."""
        if portfolio.initial_capital == 0:
            return 0.0
        
        elapsed_days = max((datetime.now() - portfolio.created_at).days, 1)
        
        total_return = portfolio.portfolio_value / portfolio.initial_capital
        annualized = ((total_return ** (365 / elapsed_days)) - 1) * 100
        
        return annualized
    
    @staticmethod
    def _calculate_sharpe_ratio(portfolio: Portfolio, risk_free_rate: float = 0.04) -> float:
        """
        Estimate Sharpe ratio (requires volatility calculation).
        For now, use a simplified approximation based on max drawdown.
        
        Args:
            portfolio: Portfolio state
            risk_free_rate: Risk-free rate (default 4% annual)
        
        Returns:
            Estimated Sharpe ratio
        """
        elapsed_days = max((datetime.now() - portfolio.created_at).days, 1)
        
        # Annualized return
        total_return = portfolio.portfolio_value / portfolio.initial_capital
        annual_return = ((total_return ** (365 / elapsed_days)) - 1)
        
        # Estimate volatility from max drawdown
        # Simple approximation: volatility ≈ |max_drawdown| / 2
        estimated_volatility = abs(portfolio.max_drawdown_pct) / 200.0
        
        if estimated_volatility == 0:
            return 0.0
        
        sharpe = (annual_return - (risk_free_rate / 100)) / estimated_volatility
        return sharpe
