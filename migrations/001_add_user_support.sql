-- Migration: Add multi-user support
-- Adds user_id columns to all tables for multi-tenancy

-- Add user_id to portfolios table
ALTER TABLE trader.portfolios
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add user_id to positions table
ALTER TABLE trader.positions
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'system';

-- Add user_id to trades table
ALTER TABLE trader.trades
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT 'system';

-- Add user_id to embeddings table (for user-specific RAG context)
ALTER TABLE trader.embeddings
  ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON trader.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON trader.positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trader.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user_id ON trader.embeddings(user_id);

-- Create users table for additional user metadata
CREATE TABLE IF NOT EXISTS trader.users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  initial_capital DECIMAL DEFAULT 10000,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Add watchlists table for user-specific watchlists
CREATE TABLE IF NOT EXISTS trader.watchlists (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tickers TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON trader.watchlists(user_id);

COMMENT ON TABLE trader.users IS 'User profile and settings';
COMMENT ON TABLE trader.watchlists IS 'User-specific stock watchlists';
