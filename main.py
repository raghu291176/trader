"""CLI entry point for Portfolio Rotation Agent with LangChain support."""

import argparse
import json
from pathlib import Path
from src.agent.portfolio_rotation import PortfolioRotationAgent
from src.agent.langchain_agent import LangChainRotationAgent
from config import USE_LLM, INITIAL_CAPITAL, CACHE_HOURS


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description="Portfolio Rotation Agent")
    
    parser.add_argument(
        "--mode",
        choices=["analyze", "trade"],
        default="analyze",
        help="Execution mode: analyze (dry-run) or trade (paper trading)",
    )
    
    parser.add_argument(
        "--capital",
        type=float,
        default=INITIAL_CAPITAL,
        help=f"Starting capital in dollars (default: ${INITIAL_CAPITAL:,.0f})",
    )
    
    parser.add_argument(
        "--watchlist",
        type=str,
        default=None,
        help="Path to custom watchlist JSON file",
    )
    
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Path to save output JSON (optional)",
    )
    
    parser.add_argument(
        "--cache-hours",
        type=int,
        default=CACHE_HOURS,
        help=f"Market data cache validity in hours (default: {CACHE_HOURS})",
    )
    
    parser.add_argument(
        "--reasoning",
        action="store_true",
        help="Enable detailed reasoning traces (requires OPENAI_API_KEY if --llm used)",
    )
    
    parser.add_argument(
        "--llm",
    # Run agent
    dry_run = args.mode == "analyze"
    print(f"\n{'='*60}")
    print(f"Portfolio Rotation Agent ({args.mode.upper()} mode)")
    print(f"{'='*60}")
    print(f"Starting capital: ${args.capital:,.2f}")
    print(f"Dry run: {dry_run}")
    if langchain_agent:
        print(f"Reasoning traces: ENABLED")
    print(f"{'='*60}\n")
    
    result = agent.run(dry_run=dry_run)
    
    # Enhance with reasoning traces if available
    if langchain_agent and result.get("watchlist_scores"):
        print("[AGENT] Generating reasoning traces...\n")
        reasoning_result = langchain_agent.run_with_reasoning(
            agent.portfolio,
            result["watchlist_scores"],
            result.get("prices", {}),
        )
        result["reasoning"] = reasoning_result
        watchlist_file=watchlist_file,
        cache_hours=args.cache_hours,
    )
    
    # Initialize LangChain agent if reasoning requested
    langchain_agent = None
    if args.reasoning or args.llm:
        try:
            langchain_agent = LangChainRotationAgent(
                use_llm=args.llm,
            )
        except Exception as e:
            print(f"[WARNING] Could not initialize LangChain agent: {e}")
    
    # Run agent
    dry_run = args.mode == "analyze"
    print(f"\n{'='*60}")
    print(f"Portfolio Rotation Agent ({args.mode.upper()} mode)")
    print(f"{'='*60}")
    print(f"Starting capital: ${args.capital:,.2f}")
    print(f"Dry run: {dry_run}")
    print(f"{'='*60}\n")
    
    result = agent.run(dry_run=dry_run)
    
    # Output results
    if "error" in result:
        print(f"\n[ERROR] {result['error']}")
    else:
        trade_plan = result.get("trade_plan", {})
        performance = result.get("performance", {})
        
        print("\n" + "="*60)
        print("TRADE PLAN")
        print("="*60)
        print(f"Recommendation: {trade_plan.get('recommendation', 'UNKNOWN')}")
        perf = performance.get("performance", {})
        print("\n" + "="*60)
        print("PERFORMANCE")
        print("="*60)
        print(f"Current Value: ${perf.get('current_value', 0):,.2f}")
        print(f"Total Return: {perf.get('total_return', 'N/A')}")
        print(f"Max Drawdown: {perf.get('max_drawdown', 'N/A')}")
        print(f"Win Rate: {perf.get('win_rate_daily', 'N/A')}")
        print(f"Sharpe Ratio: {perf.get('sharpe_ratio', 'N/A')}")
        
        # Print reasoning trace if available
        if result.get("reasoning"):
            reasoning = result["reasoning"]
            print("\n" + "="*60)
            print("REASONING TRACE")
            print("="*60)
            print(reasoning.get("trace_text", "No trace available"))
        
        # Save output if requested
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            
            print(f"\n[SUCCESS] Output saved to {args.output}")
        
        print("\n" + "="*60 + "\n").get('sharpe_ratio', 'N/A')}")
        
        # Save output if requested
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_path, 'w') as f:
                json.dump(result, f, indent=2, default=str)
            
            print(f"\n[SUCCESS] Output saved to {args.output}")
        
        print("\n" + "="*60 + "\n")
    
    return 0


if __name__ == "__main__":
    exit(main())
