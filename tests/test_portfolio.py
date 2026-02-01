"""Unit tests for portfolio management."""

import pytest
from src.models.portfolio import Portfolio


def test_portfolio_initialization():
    """Test portfolio initialization."""
    portfolio = Portfolio(initial_capital=10000.0)
    
    assert portfolio.portfolio_value == 10000.0
    assert portfolio.cash == 10000.0
    assert portfolio.num_positions == 0
    assert portfolio.total_return_pct == 0.0


def test_add_position():
    """Test adding a position."""
    portfolio = Portfolio(initial_capital=10000.0)
    
    success = portfolio.add_position(
        ticker="TEST",
        shares=10,
        price=100.0,
        score=0.75,
        reason="Test entry",
    )
    
    assert success
    assert portfolio.num_positions == 1
    assert portfolio.cash == 9000.0  # 10000 - (10 * 100)
    assert "TEST" in portfolio.positions


def test_insufficient_cash():
    """Test that adding position fails with insufficient cash."""
    portfolio = Portfolio(initial_capital=1000.0)
    
    success = portfolio.add_position(
        ticker="TEST",
        shares=20,
        price=100.0,
        score=0.75,
    )
    
    assert not success
    assert portfolio.num_positions == 0


def test_remove_position():
    """Test closing a position."""
    portfolio = Portfolio(initial_capital=10000.0)
    
    # Add position
    portfolio.add_position(ticker="TEST", shares=10, price=100.0, score=0.75)
    assert portfolio.num_positions == 1
    
    # Remove position at profit
    success, proceeds = portfolio.remove_position(ticker="TEST", price=110.0)
    
    assert success
    assert proceeds == 1100.0  # 10 * 110
    assert portfolio.num_positions == 0
    assert portfolio.cash == 9000 + 1100  # Original cash + proceeds


def test_portfolio_returns():
    """Test return calculations."""
    portfolio = Portfolio(initial_capital=10000.0)
    
    # Add position and update price
    portfolio.add_position(ticker="TEST", shares=10, price=100.0, score=0.75)
    portfolio.update_prices({"TEST": 110.0})
    
    # Unrealized return should be +10%
    position = portfolio.get_position("TEST")
    assert abs(position.unrealized_pnl_pct - 10.0) < 0.1
    
    # Close position
    portfolio.remove_position(ticker="TEST", price=110.0)
    
    # Portfolio return should be +1% (profit of 100 on 10000)
    assert abs(portfolio.total_return_pct - 1.0) < 0.1


def test_rotation():
    """Test position rotation."""
    portfolio = Portfolio(initial_capital=10000.0)
    
    # Add initial position
    portfolio.add_position(ticker="OLD", shares=50, price=100.0, score=0.5)
    
    # Rotate to new position
    success = portfolio.rotate_position(
        sell_ticker="OLD",
        buy_ticker="NEW",
        sell_price=105.0,
        buy_price=200.0,
        new_score=0.8,
        reason="Rotation test",
    )
    
    assert success
    assert "OLD" not in portfolio.positions
    assert "NEW" in portfolio.positions
    
    new_pos = portfolio.get_position("NEW")
    # Should have ~26 shares (5250 / 200)
    assert new_pos.shares == 26


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
