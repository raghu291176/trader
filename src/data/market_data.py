"""Market data fetching and caching."""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Optional
import json


class MarketDataFetcher:
    """Fetch and cache market data from Yahoo Finance."""
    
    def __init__(self, cache_hours: int = 1):
        """
        Initialize fetcher.
        
        Args:
            cache_hours: Cache validity in hours (default 1)
        """
        self.cache = {}
        self.cache_timestamps = {}
        self.cache_hours = cache_hours
    
    def is_cache_valid(self, ticker: str) -> bool:
        """Check if cached data is still valid."""
        if ticker not in self.cache_timestamps:
            return False
        
        elapsed = datetime.now() - self.cache_timestamps[ticker]
        return elapsed.total_seconds() < (self.cache_hours * 3600)
    
    def get_historical_data(
        self,
        ticker: str,
        period: str = "1y",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical OHLCV data.
        
        Args:
            ticker: Stock ticker symbol
            period: Data period (default "1y")
            interval: Candle interval (default "1d")
        
        Returns:
            DataFrame with columns: Open, High, Low, Close, Volume
        """
        try:
            data = yf.download(ticker, period=period, interval=interval, progress=False)
            return data
        except Exception as e:
            print(f"Error fetching data for {ticker}: {e}")
            return None
    
    def get_current_price(self, ticker: str) -> Optional[float]:
        """
        Get current price with caching.
        
        Args:
            ticker: Stock ticker symbol
        
        Returns:
            Current price or None if fetch fails
        """
        if self.is_cache_valid(ticker):
            return self.cache[ticker].get("current_price")
        
        try:
            data = yf.download(ticker, period="1d", interval="1d", progress=False)
            current_price = float(data["Close"].iloc[-1])
            
            self.cache[ticker] = {"current_price": current_price}
            self.cache_timestamps[ticker] = datetime.now()
            
            return current_price
        except Exception as e:
            print(f"Error fetching current price for {ticker}: {e}")
            return None
    
    def get_batch_data(self, tickers: list, period: str = "1y") -> Dict[str, pd.DataFrame]:
        """
        Fetch historical data for multiple tickers.
        
        Args:
            tickers: List of ticker symbols
            period: Data period
        
        Returns:
            Dictionary mapping ticker → DataFrame
        """
        result = {}
        for ticker in tickers:
            data = self.get_historical_data(ticker, period=period)
            if data is not None:
                result[ticker] = data
        
        return result
    
    def get_batch_current_prices(self, tickers: list) -> Dict[str, float]:
        """
        Get current prices for multiple tickers.
        
        Args:
            tickers: List of ticker symbols
        
        Returns:
            Dictionary mapping ticker → current price
        """
        result = {}
        for ticker in tickers:
            price = self.get_current_price(ticker)
            if price is not None:
                result[ticker] = price
        
        return result
