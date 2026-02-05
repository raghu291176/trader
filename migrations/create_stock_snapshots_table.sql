-- Migration: Create stock_data_snapshots table for timeseries stock data
-- Date: 2026-02-04

CREATE TABLE IF NOT EXISTS trader.stock_data_snapshots (
  id SERIAL PRIMARY KEY,
  ticker TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  current_price REAL NOT NULL,
  price_change REAL NOT NULL,
  price_change_percent REAL NOT NULL,
  recommendations JSONB,
  price_target JSONB,
  metrics JSONB,
  technical_indicators JSONB,
  news JSONB,
  earnings JSONB,
  catalysts JSONB,
  sentiment REAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(ticker, timestamp)
);

-- Create index for fast lookups by ticker
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_ticker ON trader.stock_data_snapshots(ticker);

-- Create index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_timestamp ON trader.stock_data_snapshots(timestamp DESC);

-- Create composite index for ticker + timestamp queries
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_ticker_timestamp ON trader.stock_data_snapshots(ticker, timestamp DESC);

COMMENT ON TABLE trader.stock_data_snapshots IS 'Timeseries storage for comprehensive stock data including prices, analyst ratings, news, earnings, and technical indicators';
