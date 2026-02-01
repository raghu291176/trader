"""Watchlist management."""

import json
from pathlib import Path
from typing import List, Dict, Any


class WatchlistManager:
    """Manage trading watchlist."""
    
    # Default seed watchlist
    DEFAULT_WATCHLIST = [
        "NVDA", "AMD", "SMCI", "AVGO", "MRVL",      # AI/Semiconductors
        "TSLA", "RIVN",                              # EV
        "PLTR", "CRWD", "NET", "DDOG",              # Software
        "ANET", "PANW",                              # Infrastructure
        "COIN", "MSTR",                              # Crypto-adjacent
    ]
    
    def __init__(self, watchlist_file: Path = None):
        """
        Initialize watchlist.
        
        Args:
            watchlist_file: Path to custom watchlist JSON file
        """
        self.watchlist_file = watchlist_file
        self.tickers = self.load_watchlist()
    
    def load_watchlist(self) -> List[str]:
        """Load watchlist from file or use default."""
        if self.watchlist_file and self.watchlist_file.exists():
            try:
                with open(self.watchlist_file, 'r') as f:
                    data = json.load(f)
                    return data.get("tickers", self.DEFAULT_WATCHLIST)
            except Exception as e:
                print(f"Error loading watchlist: {e}, using default")
                return self.DEFAULT_WATCHLIST
        
        return self.DEFAULT_WATCHLIST
    
    def save_watchlist(self, filepath: Path) -> None:
        """
        Save current watchlist to file.
        
        Args:
            filepath: Path to save to
        """
        with open(filepath, 'w') as f:
            json.dump({"tickers": self.tickers}, f, indent=2)
    
    def add_ticker(self, ticker: str) -> None:
        """Add ticker to watchlist."""
        if ticker not in self.tickers:
            self.tickers.append(ticker)
    
    def remove_ticker(self, ticker: str) -> None:
        """Remove ticker from watchlist."""
        if ticker in self.tickers:
            self.tickers.remove(ticker)
    
    def get_tickers(self) -> List[str]:
        """Get all tickers in watchlist."""
        return self.tickers
    
    def __len__(self) -> int:
        """Return number of tickers in watchlist."""
        return len(self.tickers)
