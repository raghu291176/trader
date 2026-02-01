"""Unit tests for scoring system."""

import pytest
import pandas as pd
import numpy as np
from src.agent.scorer import Scorer
from src.utils.indicators import RSI, MACD


def test_rsi_calculation():
    """Test RSI indicator calculation."""
    # Create sample price data
    prices = pd.Series([100, 102, 101, 103, 102, 104, 105, 103, 106, 107, 
                        105, 108, 110, 109, 112, 111, 113, 115, 114, 116])
    
    rsi = RSI(prices, period=14)
    
    # RSI should be between 0 and 100
    assert rsi.iloc[-1] >= 0
    assert rsi.iloc[-1] <= 100


def test_macd_calculation():
    """Test MACD calculation."""
    prices = pd.Series([100, 102, 101, 103, 102, 104, 105, 103, 106, 107, 
                        105, 108, 110, 109, 112, 111, 113, 115, 114, 116] * 3)
    
    macd_line, signal_line, histogram = MACD(prices)
    
    # Should return Series of same length
    assert len(macd_line) == len(prices)
    assert len(signal_line) == len(prices)
    assert len(histogram) == len(prices)
    
    # Histogram should be MACD - Signal
    # (skip NaN values at beginning)
    for i in range(20, len(histogram)):
        if pd.notna(histogram.iloc[i]) and pd.notna(macd_line.iloc[i]) and pd.notna(signal_line.iloc[i]):
            assert abs((macd_line.iloc[i] - signal_line.iloc[i]) - histogram.iloc[i]) < 0.001


def test_scorer_basic():
    """Test scorer with basic price data."""
    scorer = Scorer()
    
    # Create sample price data (uptrend)
    prices = pd.Series(np.linspace(100, 120, 50))
    volume = pd.Series([1000000] * 50)
    
    df = pd.DataFrame({
        "Open": prices * 0.99,
        "High": prices * 1.01,
        "Low": prices * 0.98,
        "Close": prices,
        "Volume": volume,
    })
    
    # Score with high catalyst strength
    score = scorer.score(
        ticker="TEST",
        price_data=df,
        catalyst_strength=0.8,
        upside_potential=0.2,
    )
    
    assert 0 <= score <= 1
    assert score > 0  # Should be positive with uptrend


def test_scorer_timing_factor():
    """Test timing factor calculation."""
    scorer = Scorer()
    
    # Create price data with RSI near 50 (early entry zone)
    prices = pd.Series(np.linspace(100, 105, 50))
    volume = pd.Series([1000000] * 50)
    
    df = pd.DataFrame({
        "Open": prices * 0.99,
        "High": prices * 1.01,
        "Low": prices * 0.98,
        "Close": prices,
        "Volume": volume,
    })
    
    rsi_values = RSI(df["Close"], period=14)
    current_rsi = rsi_values.iloc[-1]
    
    # RSI should be in 40-60 range (early entry)
    assert 40 <= current_rsi <= 60
    
    # Score with this timing should get +0.5 bonus
    score = scorer.score(
        ticker="TEST",
        price_data=df,
        catalyst_strength=0.5,
        upside_potential=0.1,
    )
    
    assert score > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
