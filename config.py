"""Configuration and environment setup."""

import os
from pathlib import Path
from dotenv import load_dotenv


# Load environment variables
env_file = Path(__file__).parent.parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")

# Agent Configuration
AGENT_MODE = os.getenv("AGENT_MODE", "analyze")  # "analyze" or "trade"
USE_LLM = os.getenv("USE_LLM", "false").lower() == "true"
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4")

# Trading Parameters
INITIAL_CAPITAL = float(os.getenv("INITIAL_CAPITAL", "10000"))
ROTATION_THRESHOLD = float(os.getenv("ROTATION_THRESHOLD", "0.02"))
STOP_LOSS_PCT = float(os.getenv("STOP_LOSS_PCT", "-15"))
MAX_DRAWDOWN_PCT = float(os.getenv("MAX_DRAWDOWN_PCT", "-30"))
MIN_CASH = float(os.getenv("MIN_CASH", "10"))

# Data Caching
CACHE_HOURS = int(os.getenv("CACHE_HOURS", "1"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
