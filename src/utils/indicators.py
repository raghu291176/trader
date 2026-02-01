"""Technical indicator calculations."""

import numpy as np
import pandas as pd
from typing import Tuple, List


def RSI(prices: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Relative Strength Index (RSI).
    
    Args:
        prices: Series of closing prices
        period: RSI period (default 14)
    
    Returns:
        Series of RSI values (0-100)
    """
    if len(prices) < period + 1:
        return pd.Series([np.nan] * len(prices), index=prices.index)
    
    delta = prices.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi


def MACD(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """
    Calculate MACD (Moving Average Convergence Divergence).
    
    Args:
        prices: Series of closing prices
        fast: Fast EMA period (default 12)
        slow: Slow EMA period (default 26)
        signal: Signal line period (default 9)
    
    Returns:
        Tuple of (MACD line, Signal line, Histogram)
    """
    if len(prices) < slow + signal:
        return (
            pd.Series([np.nan] * len(prices), index=prices.index),
            pd.Series([np.nan] * len(prices), index=prices.index),
            pd.Series([np.nan] * len(prices), index=prices.index),
        )
    
    ema_fast = prices.ewm(span=fast).mean()
    ema_slow = prices.ewm(span=slow).mean()
    
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal).mean()
    histogram = macd_line - signal_line
    
    return macd_line, signal_line, histogram


def calculate_volume_ratio(volumes: pd.Series, window: int = 20) -> pd.Series:
    """
    Calculate volume ratio: current volume / average volume.
    
    Args:
        volumes: Series of trading volumes
        window: Average window (default 20 days)
    
    Returns:
        Series of volume ratios
    """
    if len(volumes) < window:
        return pd.Series([np.nan] * len(volumes), index=volumes.index)
    
    avg_volume = volumes.rolling(window=window).mean()
    ratio = volumes / avg_volume
    
    return ratio


def crossover(series1: pd.Series, series2: pd.Series) -> pd.Series:
    """
    Detect crossover: returns 1 if series1 crosses above series2, -1 if crosses below, 0 otherwise.
    
    Args:
        series1: First series
        series2: Second series
    
    Returns:
        Series of crossover signals (-1, 0, 1)
    """
    if len(series1) < 2 or len(series2) < 2:
        return pd.Series([0] * len(series1), index=series1.index)
    
    prev_diff = (series1.shift(1) - series2.shift(1))
    curr_diff = series1 - series2
    
    crossover_signal = np.where(
        (prev_diff <= 0) & (curr_diff > 0), 1,  # Crossover above
        np.where((prev_diff >= 0) & (curr_diff < 0), -1, 0)  # Crossover below
    )
    
    return pd.Series(crossover_signal, index=series1.index)
