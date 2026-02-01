"""Expected return score calculation."""

import pandas as pd
import numpy as np
from typing import Optional, Dict
from src.utils.indicators import RSI, MACD


class Scorer:
    """Calculate expected return scores for opportunities."""
    
    def __init__(self):
        """Initialize scorer with default parameters."""
        self.rsi_period = 14
        self.rsi_early_entry_min = 40
        self.rsi_early_entry_max = 60
        self.rsi_mid_momentum_min = 60
        self.rsi_mid_momentum_max = 70
        self.rsi_late_momentum_min = 70
        self.rsi_late_momentum_max = 75
        self.rsi_extended_threshold = 75
    
    def score(
        self,
        ticker: str,
        price_data: pd.DataFrame,
        catalyst_strength: float,
        upside_potential: float,
        analyst_target: Optional[float] = None,
        news_sentiment: Optional[float] = None,
    ) -> float:
        """
        Calculate expected return score (0-1).
        
        Formula:
        expected_return_score = 
            (catalyst_strength × 0.40) +
            (momentum_acceleration × 0.30) +
            (upside_potential × 0.20) +
            (timing_factor × 0.10)
        
        Args:
            ticker: Stock ticker symbol
            price_data: DataFrame with columns [Open, High, Low, Close, Volume]
            catalyst_strength: Catalyst strength (0-1)
            upside_potential: Upside potential ratio (0-1), capped at 1.0
            analyst_target: Analyst price target
            news_sentiment: News sentiment score
        
        Returns:
            Expected return score (0-1)
        """
        # Clamp inputs to valid ranges
        catalyst_strength = max(0, min(1.0, catalyst_strength))
        upside_potential = max(0, min(1.0, upside_potential))
        
        # Calculate momentum acceleration
        momentum_acceleration = self._calculate_momentum_acceleration(price_data)
        
        # Calculate timing factor
        timing_factor = self._calculate_timing_factor(price_data)
        
        # Weighted combination
        score = (
            (catalyst_strength * 0.40) +
            (momentum_acceleration * 0.30) +
            (upside_potential * 0.20) +
            (timing_factor * 0.10)
        )
        
        return max(0, min(1.0, score))
    
    def _calculate_momentum_acceleration(self, price_data: pd.DataFrame) -> float:
        """
        Calculate momentum acceleration factor (-1 to +1).
        
        Formula:
        momentum_acceleration = 
            (current_rsi - rsi_5_days_ago) / 50 +
            (macd_histogram_today - macd_histogram_5_days_ago) normalized
        """
        if len(price_data) < 6:
            return 0.0
        
        # RSI momentum
        rsi_values = RSI(price_data["Close"], period=self.rsi_period)
        if len(rsi_values) >= 6:
            rsi_current = rsi_values.iloc[-1]
            rsi_5_days_ago = rsi_values.iloc[-6]
            
            if pd.notna(rsi_current) and pd.notna(rsi_5_days_ago):
                rsi_momentum = (rsi_current - rsi_5_days_ago) / 50
            else:
                rsi_momentum = 0.0
        else:
            rsi_momentum = 0.0
        
        # MACD momentum
        macd_line, signal_line, histogram = MACD(price_data["Close"])
        if len(histogram) >= 6:
            histogram_current = histogram.iloc[-1]
            histogram_5_days_ago = histogram.iloc[-6]
            
            if pd.notna(histogram_current) and pd.notna(histogram_5_days_ago):
                # Normalize MACD change
                macd_momentum = (histogram_current - histogram_5_days_ago) / max(
                    abs(histogram.iloc[-10:]).max(), 0.0001
                )
            else:
                macd_momentum = 0.0
        else:
            macd_momentum = 0.0
        
        momentum_acceleration = (rsi_momentum + macd_momentum) / 2.0
        return max(-1.0, min(1.0, momentum_acceleration))
    
    def _calculate_timing_factor(self, price_data: pd.DataFrame) -> float:
        """
        Calculate timing factor (-0.5 to +0.5).
        
        Timing bonus/penalty:
        +0.5 if entering momentum (RSI 40-60, MACD just crossed bullish)
        +0.25 if mid-momentum (RSI 60-70, MACD positive)
        0 if late momentum (RSI 70-75)
        -0.5 if extended (RSI > 75 or MACD weakening)
        """
        if len(price_data) < 2:
            return 0.0
        
        rsi_values = RSI(price_data["Close"], period=self.rsi_period)
        if len(rsi_values) == 0 or pd.isna(rsi_values.iloc[-1]):
            return 0.0
        
        current_rsi = rsi_values.iloc[-1]
        
        # Check MACD state
        macd_line, signal_line, histogram = MACD(price_data["Close"])
        macd_positive = len(histogram) > 0 and histogram.iloc[-1] > 0
        
        # Early entry (entering momentum)
        if self.rsi_early_entry_min <= current_rsi <= self.rsi_early_entry_max and macd_positive:
            return 0.5
        
        # Mid-momentum
        if self.rsi_mid_momentum_min <= current_rsi <= self.rsi_mid_momentum_max and macd_positive:
            return 0.25
        
        # Late momentum
        if self.rsi_late_momentum_min <= current_rsi <= self.rsi_late_momentum_max:
            return 0.0
        
        # Extended (overbought or MACD weakening)
        if current_rsi > self.rsi_extended_threshold or (len(histogram) > 1 and histogram.iloc[-1] < histogram.iloc[-2]):
            return -0.5
        
        return 0.0
    
    def batch_score(
        self,
        scores_data: Dict[str, Dict],
    ) -> Dict[str, float]:
        """
        Score multiple tickers at once.
        
        Args:
            scores_data: Dict mapping ticker → {
                'price_data': DataFrame,
                'catalyst_strength': float,
                'upside_potential': float,
                'analyst_target': float or None,
            }
        
        Returns:
            Dict mapping ticker → score
        """
        results = {}
        for ticker, data in scores_data.items():
            try:
                score = self.score(
                    ticker=ticker,
                    price_data=data["price_data"],
                    catalyst_strength=data.get("catalyst_strength", 0.0),
                    upside_potential=data.get("upside_potential", 0.0),
                    analyst_target=data.get("analyst_target"),
                    news_sentiment=data.get("news_sentiment"),
                )
                results[ticker] = score
            except Exception as e:
                print(f"Error scoring {ticker}: {e}")
                results[ticker] = 0.0
        
        return results
