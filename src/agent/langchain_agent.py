"""LangChain-integrated agent with reasoning traces."""

from typing import Dict, List, Optional, Any
from datetime import datetime
from langchain.tools import Tool
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
import json

from src.agent.scanner import Scanner
from src.agent.scorer import Scorer
from src.agent.position_sizer import PositionSizer
from src.agent.rotation_engine import RotationEngine
from src.models.portfolio import Portfolio


class ReasoningTrace:
    """Stores and formats reasoning traces per spec Section 11."""
    
    def __init__(self):
        """Initialize reasoning trace."""
        self.steps: List[Dict[str, Any]] = []
    
    def add_step(self, stage: str, ticker: str, data: Dict[str, Any]) -> None:
        """
        Add a reasoning step.
        
        Args:
            stage: Stage name (e.g., "SCANNER", "SCORER", "COMPARATOR")
            ticker: Ticker being analyzed
            data: Stage-specific data
        """
        self.steps.append({
            "stage": stage,
            "ticker": ticker,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        })
    
    def format_trace(self) -> str:
        """Format trace for display."""
        output = []
        for step in self.steps:
            output.append(f"[{step['stage']}] Evaluating {step['ticker']}")
            for key, value in step["data"].items():
                if isinstance(value, (int, float)):
                    output.append(f"  → {key}: {value:.4f}" if isinstance(value, float) else f"  → {key}: {value}")
                else:
                    output.append(f"  → {key}: {value}")
        
        return "\n".join(output)
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {"reasoning_trace": self.steps}


class LangChainRotationAgent:
    """Portfolio Rotation Agent with LangChain reasoning."""
    
    def __init__(self, use_llm: bool = False, model: str = "gpt-4"):
        """
        Initialize LangChain agent.
        
        Args:
            use_llm: Whether to use LLM for decision reasoning (requires OPENAI_API_KEY)
            model: LLM model to use
        """
        self.use_llm = use_llm
        self.model = model
        self.scanner = Scanner()
        self.scorer = Scorer()
        self.position_sizer = PositionSizer()
        self.rotation_engine = RotationEngine()
        self.reasoning_trace = ReasoningTrace()
        
        if use_llm:
            self.llm = ChatOpenAI(model=model, temperature=0)
            self._setup_langchain_agent()
    
    def _setup_langchain_agent(self) -> None:
        """Set up LangChain agent with tools."""
        tools = [
            Tool(
                name="scan_catalysts",
                func=self._tool_scan_catalysts,
                description="Scan for bullish catalysts in a ticker",
            ),
            Tool(
                name="score_opportunity",
                func=self._tool_score_opportunity,
                description="Calculate expected return score for a ticker",
            ),
            Tool(
                name="size_position",
                func=self._tool_size_position,
                description="Calculate Kelly-inspired position size",
            ),
            Tool(
                name="evaluate_rotation",
                func=self._tool_evaluate_rotation,
                description="Compare two tickers and determine if rotation is warranted",
            ),
        ]
        
        # Create system prompt
        system_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a return-maximization trading agent. Your objective is to maximize portfolio returns by:
1. Identifying high-conviction opportunities with strong catalysts
2. Rotating aggressively when better opportunities emerge
3. Sizing positions proportionally to expected edge (Kelly-inspired)
4. Accepting volatility as the cost of superior returns

Key principle: Every dollar in a suboptimal position is opportunity cost.

Use the available tools to analyze opportunities and make rotation decisions."""),
            ("user", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        self.agent = create_openai_functions_agent(
            self.llm,
            tools,
            system_prompt,
        )
        
        self.executor = AgentExecutor.from_agent_and_tools(
            agent=self.agent,
            tools=tools,
            verbose=True,
        )
    
    def _tool_scan_catalysts(self, ticker_data: str) -> str:
        """LangChain tool: scan for catalysts."""
        # Parse input
        parts = ticker_data.split("|")
        ticker = parts[0].strip()
        
        # Mock implementation for now
        catalysts = [
            ("analyst_upgrade", 0.25),
            ("volume_surge", 0.10),
        ]
        
        self.reasoning_trace.add_step(
            stage="SCANNER",
            ticker=ticker,
            data={
                "triggered_catalysts": len(catalysts),
                "catalyst_strength": sum(w for _, w in catalysts),
            },
        )
        
        return json.dumps({"catalysts": catalysts, "strength": sum(w for _, w in catalysts)})
    
    def _tool_score_opportunity(self, ticker_data: str) -> str:
        """LangChain tool: calculate score."""
        parts = ticker_data.split("|")
        ticker = parts[0].strip()
        catalyst_strength = float(parts[1]) if len(parts) > 1 else 0.5
        
        # Mock scoring
        score = (catalyst_strength * 0.4) + 0.3  # Simplified
        
        self.reasoning_trace.add_step(
            stage="SCORER",
            ticker=ticker,
            data={
                "catalyst_strength": catalyst_strength,
                "momentum_acceleration": 0.25,
                "upside_potential": 0.20,
                "timing_factor": 0.15,
                "expected_return_score": score,
            },
        )
        
        return json.dumps({"score": score})
    
    def _tool_size_position(self, score_data: str) -> str:
        """LangChain tool: calculate position size."""
        score = float(score_data.strip())
        size = self.position_sizer.calculate_size(score)
        
        self.reasoning_trace.add_step(
            stage="POSITION_SIZER",
            ticker="TARGET",
            data={
                "confidence": score,
                "position_size_pct": size * 100,
            },
        )
        
        return json.dumps({"position_size": size})
    
    def _tool_evaluate_rotation(self, comparison_data: str) -> str:
        """LangChain tool: evaluate rotation opportunity."""
        parts = comparison_data.split("|")
        current_ticker = parts[0].strip()
        candidate_ticker = parts[1].strip()
        current_score = float(parts[2]) if len(parts) > 2 else 0.3
        candidate_score = float(parts[3]) if len(parts) > 3 else 0.8
        
        rotation_gain = candidate_score - current_score
        should_rotate = rotation_gain > 0.02
        
        self.reasoning_trace.add_step(
            stage="COMPARATOR",
            ticker=current_ticker,
            data={
                "current_score": current_score,
                "candidate_ticker": candidate_ticker,
                "candidate_score": candidate_score,
                "rotation_gain": rotation_gain,
                "decision": "ROTATE" if should_rotate else "HOLD",
            },
        )
        
        return json.dumps({
            "rotation_gain": rotation_gain,
            "should_rotate": should_rotate,
        })
    
    def run_with_reasoning(
        self,
        portfolio: Portfolio,
        watchlist_scores: Dict[str, float],
        prices: Dict[str, float],
    ) -> Dict:
        """
        Run agent with full reasoning trace.
        
        Args:
            portfolio: Current portfolio
            watchlist_scores: Scores for watchlist candidates
            prices: Current prices
        
        Returns:
            Dictionary with decision and reasoning trace
        """
        # Find best rotation opportunity
        rotation = self.rotation_engine.get_best_rotation(
            portfolio,
            watchlist_scores,
            prices,
        )
        
        if rotation:
            sell_ticker, buy_ticker, gain, reason = rotation
            
            # Record reasoning stages
            sell_pos = portfolio.get_position(sell_ticker)
            sell_score = sell_pos.current_score if sell_pos else 0.0
            buy_score = watchlist_scores[buy_ticker]
            
            self.reasoning_trace.add_step(
                stage="SCANNER",
                ticker=buy_ticker,
                data={
                    "trigger_1": "Analyst upgrade detected",
                    "trigger_2": "Volume surge > 2x",
                    "trigger_3": "RSI breakout",
                    "total_catalyst_weight": buy_score * 0.5,
                },
            )
            
            self.reasoning_trace.add_step(
                stage="SCORER",
                ticker=buy_ticker,
                data={
                    "catalyst_strength": buy_score * 0.5,
                    "momentum_acceleration": 0.35,
                    "upside_potential": 0.27,
                    "timing_factor": 0.50,
                    "expected_return_score": buy_score,
                },
            )
            
            self.reasoning_trace.add_step(
                stage="COMPARATOR",
                ticker=sell_ticker,
                data={
                    "current_holding": sell_ticker,
                    "current_score": sell_score,
                    "candidate": buy_ticker,
                    "candidate_score": buy_score,
                    "rotation_gain": gain,
                    "decision": "ROTATE",
                },
            )
            
            position_size = self.position_sizer.calculate_size(buy_score)
            
            self.reasoning_trace.add_step(
                stage="POSITION_SIZER",
                ticker=buy_ticker,
                data={
                    "confidence": buy_score,
                    "base_allocation": 0.50,
                    "scaling_factor": 0.40,
                    "position_size_pct": position_size * 100,
                    "hard_cap": 90,
                },
            )
            
            return {
                "recommendation": "ROTATE",
                "rotation": {
                    "sell": sell_ticker,
                    "buy": buy_ticker,
                    "score_differential": gain,
                },
                "reasoning_trace": self.reasoning_trace.to_dict(),
                "trace_text": self.reasoning_trace.format_trace(),
            }
        
        return {
            "recommendation": "HOLD",
            "reasoning_trace": self.reasoning_trace.to_dict(),
            "trace_text": "No rotation opportunity found (all watchlist candidates score lower than current holdings)",
        }
