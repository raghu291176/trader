"""Signal detection and catalyst identification."""

import pandas as pd
from typing import List, Tuple, Dict, Optional
from src.utils.indicators import RSI, MACD, calculate_volume_ratio, crossover


class Scanner:
    """Detect bullish catalysts and exit signals."""
    
    # Catalyst weights
    CATALYST_WEIGHTS = {
        "analyst_upgrade": 0.25,           # ≥15% price target increase
        "earnings_surprise": 0.20,         # >+10% surprise
        "rsi_crossover_above_50": 0.15,    # RSI crossing above 50 from below
        "macd_bullish_crossover": 0.15,    # MACD bullish crossover
        "volume_surge": 0.10,              # >2x 20-day average
        "news_sentiment_spike": 0.10,      # Sentiment >0.7
        "sector_rotation_inflow": 0.05,    # Positive sector momentum
    }
    
    def __init__(self):
        """Initialize scanner."""
        self.rsi_period = 14
        self.volume_window = 20
        self.volume_surge_threshold = 2.0
        self.rsi_threshold = 50
        self.rsi_above_75 = 75
        self.rsi_overbought = 75
    
    def detect_catalysts(
        self,
        ticker: str,
        price_data: pd.DataFrame,
        analyst_target: Optional[float] = None,
        earnings_surprise: Optional[float] = None,
        news_sentiment: Optional[float] = None,
        sector_momentum: Optional[float] = None,
    ) -> List[Tuple[str, float]]:
        """
        Detect triggered catalysts for a ticker.
        
        Args:
            ticker: Stock ticker symbol
            price_data: DataFrame with columns [Open, High, Low, Close, Volume]
            analyst_target: Analyst price target for upside calculation
            earnings_surprise: Earnings surprise percentage
            news_sentiment: News sentiment score (0-1)
            sector_momentum: Sector momentum score
        
        Returns:
            List of (catalyst_name, weight) tuples for triggered catalysts
        """
        triggered = []
        
        # Analyst upgrade check
        if analyst_target is not None:
            current_price = price_data["Close"].iloc[-1]
            upside = (analyst_target - current_price) / current_price
            if upside >= 0.15:  # ≥15% upside
                triggered.append(("analyst_upgrade", self.CATALYST_WEIGHTS["analyst_upgrade"]))
        
        # Earnings surprise check
        if earnings_surprise is not None and earnings_surprise > 0.10:
            triggered.append(("earnings_surprise", self.CATALYST_WEIGHTS["earnings_surprise"]))
        
        # RSI crossover above 50
        rsi_values = RSI(price_data["Close"], period=self.rsi_period)
        if len(rsi_values) >= 2:
            current_rsi = rsi_values.iloc[-1]
            prev_rsi = rsi_values.iloc[-2]
            if prev_rsi <= self.rsi_threshold and current_rsi > self.rsi_threshold:
                triggered.append(("rsi_crossover_above_50", self.CATALYST_WEIGHTS["rsi_crossover_above_50"]))
        
        # MACD bullish crossover
        macd_line, signal_line, histogram = MACD(price_data["Close"])
        if len(histogram) >= 2:
            prev_histogram = histogram.iloc[-2]
            curr_histogram = histogram.iloc[-1]
            if prev_histogram <= 0 and curr_histogram > 0:
                triggered.append(("macd_bullish_crossover", self.CATALYST_WEIGHTS["macd_bullish_crossover"]))
        
        # Volume surge
        volumes = calculate_volume_ratio(price_data["Volume"], window=self.volume_window)
        if len(volumes) > 0:
            current_vol_ratio = volumes.iloc[-1]
            if current_vol_ratio > self.volume_surge_threshold:
                triggered.append(("volume_surge", self.CATALYST_WEIGHTS["volume_surge"]))
        
        # News sentiment spike
        if news_sentiment is not None and news_sentiment > 0.7:
            triggered.append(("news_sentiment_spike", self.CATALYST_WEIGHTS["news_sentiment_spike"]))
        
        # Sector rotation inflow
        if sector_momentum is not None and sector_momentum > 0:
            triggered.append(("sector_rotation_inflow", self.CATALYST_WEIGHTS["sector_rotation_inflow"]))
        
        return triggered
    
    def calculate_catalyst_strength(self, triggered_catalysts: List[Tuple[str, float]]) -> float:
        """
        Calculate total catalyst strength from triggered catalysts.
        
        Args:
            triggered_catalysts: List of (catalyst_name, weight) tuples
        
        Returns:
            Sum of catalyst weights, capped at 1.0
        """
        total_strength = sum(weight for _, weight in triggered_catalysts)
        return min(total_strength, 1.0)
    
    def should_exit(
        self,
        ticker: str,
        price_data: pd.DataFrame,
        position_score: float,
        consecutive_negative_days: int = 0,
        analyst_target: Optional[float] = None,
        price_target_achieved: bool = False,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if position should be exited.
        
        Args:
            ticker: Stock ticker symbol
            price_data: DataFrame with price data
            position_score: Current position's expected return score
            consecutive_negative_days: Days of consecutive negative score change
            analyst_target: Analyst price target
            price_target_achieved: Whether analyst target was achieved
        
        Returns:
            Tuple of (should_exit: bool, reason: str)
        """
        current_price = price_data["Close"].iloc[-1]
        
        # RSI > 75 (overbought)
        rsi_values = RSI(price_data["Close"], period=self.rsi_period)
        if len(rsi_values) > 0:
            current_rsi = rsi_values.iloc[-1]
            if current_rsi > 75:
                return True, "RSI > 75 (overbought)"
        
        # MACD bearish crossover
        macd_line, signal_line, histogram = MACD(price_data["Close"])
        if len(histogram) >= 2:
            prev_histogram = histogram.iloc[-2]
            curr_histogram = histogram.iloc[-1]
            if prev_histogram > 0 and curr_histogram <= 0:
                return True, "MACD bearish crossover"
        
        # Price target achieved
        if price_target_achieved and analyst_target is not None:
            if current_price >= analyst_target:
                return True, "Analyst price target achieved"
        
        # Consecutive negative days
        if consecutive_negative_days >= 3:
            return True, "3 consecutive days of negative momentum"
        
        return False, None
    
    def get_catalyst_summary(self, triggered_catalysts: List[Tuple[str, float]]) -> str:
        """Get human-readable summary of triggered catalysts."""
        if not triggered_catalysts:
            return "No catalysts detected"
        
        summaries = {
            "analyst_upgrade": "Analyst upgrade with ≥15% upside",
            "earnings_surprise": "Earnings surprise > +10%",
            "rsi_crossover_above_50": "RSI crossed above 50",
            "macd_bullish_crossover": "MACD bullish crossover",
            "volume_surge": "Volume surge > 2x average",
            "news_sentiment_spike": "News sentiment spike (>0.7)",
            "sector_rotation_inflow": "Sector rotation inflow detected",
        }
        
        return " | ".join(
            summaries.get(name, name)
            for name, _ in triggered_catalysts
        )
