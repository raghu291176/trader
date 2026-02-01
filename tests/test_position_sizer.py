"""Unit tests for position sizing."""

import pytest
from src.agent.position_sizer import PositionSizer


def test_position_sizer_ranges():
    """Test that position sizes stay within 10%-90% range."""
    sizer = PositionSizer()
    
    # Low confidence
    size_low = sizer.calculate_size(0.1)
    assert 0.10 <= size_low <= 0.90
    assert size_low >= 0.10  # Should be at least minimum
    
    # Medium confidence
    size_med = sizer.calculate_size(0.5)
    assert 0.10 <= size_med <= 0.90
    
    # High confidence
    size_high = sizer.calculate_size(0.9)
    assert 0.10 <= size_high <= 0.90
    assert size_high >= size_med >= size_low  # Should scale with confidence


def test_position_sizer_scaling():
    """Test that position size scales with confidence."""
    sizer = PositionSizer()
    
    score_low = 0.2
    score_high = 0.8
    
    size_low = sizer.calculate_size(score_low)
    size_high = sizer.calculate_size(score_high)
    
    assert size_high > size_low


def test_kelly_formula():
    """Test Kelly Criterion calculation."""
    sizer = PositionSizer()
    
    # 60% win rate, avg win 8%, avg loss 4%
    edge, odds, kelly_size = sizer.kelly_formula(
        win_rate=0.60,
        avg_win=0.08,
        avg_loss=0.04,
    )
    
    # Edge = (0.60 * 0.08) - (0.40 * 0.04) = 0.048 - 0.016 = 0.032
    assert abs(edge - 0.032) < 0.001
    
    # Odds = 0.08 / 0.04 = 2.0
    assert abs(odds - 2.0) < 0.001
    
    # Kelly size should be positive
    assert kelly_size > 0
    assert kelly_size <= 0.90  # Should respect max


def test_shares_calculation():
    """Test share calculation."""
    sizer = PositionSizer()
    
    portfolio_value = 10000.0
    position_pct = 0.70
    share_price = 150.0
    
    shares = sizer.calculate_shares(portfolio_value, position_pct, share_price)
    
    # Should be 7000 / 150 = 46 shares (rounded down)
    assert shares == 46
    assert shares >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
