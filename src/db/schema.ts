/**
 * Neon PostgreSQL Schema with pgvector
 * Drizzle ORM schema definition
 */

import { pgTable, serial, text, real, timestamp, jsonb, integer, boolean, vector } from 'drizzle-orm/pg-core';

/**
 * Portfolios table - tracks portfolio state
 */
export const portfolios = pgTable('portfolios', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().default('default'),
  initialCapital: real('initial_capital').notNull(),
  currentValue: real('current_value').notNull(),
  cash: real('cash').notNull(),
  peakValue: real('peak_value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Positions table - active and closed positions
 */
export const positions = pgTable('positions', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').notNull(),
  ticker: text('ticker').notNull(),
  shares: integer('shares').notNull(),
  entryPrice: real('entry_price').notNull(),
  currentPrice: real('current_price').notNull(),
  entryScore: real('entry_score').notNull(),
  entryTimestamp: timestamp('entry_timestamp').notNull(),
  peakPrice: real('peak_price').notNull(),
  exitPrice: real('exit_price'),
  exitTimestamp: timestamp('exit_timestamp'),
  realizedPnL: real('realized_pnl'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Trades table - all trade executions
 */
export const trades = pgTable('trades', {
  id: serial('id').primaryKey(),
  portfolioId: integer('portfolio_id').notNull(),
  ticker: text('ticker').notNull(),
  type: text('type').notNull(), // BUY, SELL, ROTATION_IN, ROTATION_OUT
  shares: integer('shares').notNull(),
  price: real('price').notNull(),
  score: real('score'),
  reason: text('reason'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

/**
 * Market Intelligence - analyst reports, news, politician trades
 */
export const marketIntelligence = pgTable('market_intelligence', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // analyst_report, market_news, politician_trade
  ticker: text('ticker'),
  source: text('source').notNull(),
  headline: text('headline'),
  summary: text('summary').notNull(),
  sentiment: real('sentiment'),
  targetPrice: real('target_price'),
  rating: text('rating'), // BUY, HOLD, SELL, UPGRADE, DOWNGRADE
  politicianName: text('politician_name'),
  tradeAmount: real('trade_amount'),
  tradeType: text('trade_type'), // PURCHASE, SALE
  catalysts: jsonb('catalysts').$type<string[]>(),
  tickers: jsonb('tickers').$type<string[]>(),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

/**
 * Vector embeddings for RAG (using pgvector extension)
 */
export const embeddings = pgTable('embeddings', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI ada-002 embeddings
  metadata: jsonb('metadata'),
  type: text('type').notNull(), // portfolio, trade, analyst_report, news, etc.
  ticker: text('ticker'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

/**
 * Politician Trading Activity (Nancy Pelosi tracker)
 */
export const politicianTrades = pgTable('politician_trades', {
  id: serial('id').primaryKey(),
  politicianName: text('politician_name').notNull(),
  ticker: text('ticker').notNull(),
  tradeType: text('trade_type').notNull(), // PURCHASE, SALE, EXCHANGE
  amount: real('amount').notNull(), // Dollar amount
  shares: integer('shares'),
  price: real('price'),
  filingDate: timestamp('filing_date').notNull(),
  transactionDate: timestamp('transaction_date').notNull(),
  assetDescription: text('asset_description'),
  disclosure: text('disclosure'), // Link to official disclosure
  party: text('party'), // Democrat, Republican
  chamber: text('chamber'), // House, Senate
  performanceRating: real('performance_rating'), // Historical performance metric
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

// Type exports for TypeScript
export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
export type MarketIntel = typeof marketIntelligence.$inferSelect;
export type NewMarketIntel = typeof marketIntelligence.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type PoliticianTrade = typeof politicianTrades.$inferSelect;
export type NewPoliticianTrade = typeof politicianTrades.$inferInsert;
