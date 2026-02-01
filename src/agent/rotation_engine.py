"""Rotation decision logic and execution."""

from typing import List, Tuple, Optional, Dict
from src.models.portfolio import Portfolio


class RotationEngine:
    """Manages rotation decisions and execution."""
    
    def __init__(self, rotation_threshold: float = 0.02, max_rotations_per_run: int = 1):
        """
        Initialize rotation engine.
        
        Args:
            rotation_threshold: Minimum score differential to trigger rotation (default 0.02)
            max_rotations_per_run: Maximum rotations per run (default 1)
        """
        self.rotation_threshold = rotation_threshold
        self.max_rotations_per_run = max_rotations_per_run
        self.last_rotations = {}  # Track recent rotations to avoid thrashing
    
    def evaluate_rotations(
        self,
        portfolio: Portfolio,
        watchlist_scores: Dict[str, float],
    ) -> List[Tuple[str, str, float]]:
        """
        Evaluate potential rotations from current holdings to watchlist candidates.
        
        Args:
            portfolio: Current portfolio state
            watchlist_scores: Dictionary mapping ticker → expected return score
        
        Returns:
            List of (sell_ticker, buy_ticker, score_differential) tuples,
            sorted by score_differential (highest first)
        """
        rotation_candidates = []
        
        # For each position, check if a watchlist candidate is better
        for holding_ticker, position in portfolio.positions.items():
            holding_score = position.current_score or 0.0
            
            for candidate_ticker, candidate_score in watchlist_scores.items():
                # Skip if candidate already held
                if candidate_ticker in portfolio.positions:
                    continue
                
                # Calculate rotation gain
                rotation_gain = candidate_score - holding_score
                
                # Check if meets threshold
                if rotation_gain > self.rotation_threshold:
                    rotation_candidates.append((
                        holding_ticker,
                        candidate_ticker,
                        rotation_gain,
                    ))
        
        # Sort by rotation gain (highest first)
        rotation_candidates.sort(key=lambda x: x[2], reverse=True)
        
        return rotation_candidates
    
    def execute_rotation(
        self,
        portfolio: Portfolio,
        sell_ticker: str,
        buy_ticker: str,
        prices: Dict[str, float],
        new_score: float,
        reason: str = "",
    ) -> Tuple[bool, Optional[str]]:
        """
        Execute a rotation trade.
        
        Args:
            portfolio: Portfolio to update
            sell_ticker: Ticker to sell
            buy_ticker: Ticker to buy
            prices: Dictionary mapping ticker → current price
            new_score: Expected return score of new position
            reason: Trade reason
        
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        if sell_ticker not in prices or buy_ticker not in prices:
            return False, "Price data missing"
        
        sell_price = prices[sell_ticker]
        buy_price = prices[buy_ticker]
        
        if sell_price <= 0 or buy_price <= 0:
            return False, "Invalid prices"
        
        # Execute rotation
        success = portfolio.rotate_position(
            sell_ticker=sell_ticker,
            buy_ticker=buy_ticker,
            sell_price=sell_price,
            buy_price=buy_price,
            new_score=new_score,
            reason=reason,
        )
        
        if not success:
            return False, f"Rotation failed: insufficient proceeds or cash"
        
        # Track this rotation
        self.last_rotations[sell_ticker] = buy_ticker
        
        return True, None
    
    def get_best_rotation(
        self,
        portfolio: Portfolio,
        watchlist_scores: Dict[str, float],
        prices: Dict[str, float],
    ) -> Optional[Tuple[str, str, float, str]]:
        """
        Get the single best rotation opportunity.
        
        Args:
            portfolio: Current portfolio
            watchlist_scores: Scores for all watchlist candidates
            prices: Current prices
        
        Returns:
            Tuple of (sell_ticker, buy_ticker, score_differential, reason)
            or None if no rotation available
        """
        rotations = self.evaluate_rotations(portfolio, watchlist_scores)
        
        if not rotations:
            return None
        
        sell_ticker, buy_ticker, gain = rotations[0]
        reason = f"Score improved from {watchlist_scores.get(sell_ticker, 0):.3f} to {watchlist_scores.get(buy_ticker, 0):.3f} (+{gain:.3f})"
        
        return sell_ticker, buy_ticker, gain, reason
    
    def should_execute_rotation(
        self,
        portfolio: Portfolio,
        minimum_cash: float = 10.0,
    ) -> bool:
        """
        Check if rotation can be executed (sufficient cash).
        
        Args:
            portfolio: Current portfolio
            minimum_cash: Minimum cash to maintain
        
        Returns:
            True if rotation can proceed
        """
        return portfolio.cash >= minimum_cash
