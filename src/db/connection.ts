/**
 * Neon PostgreSQL Connection
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create Neon HTTP client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

/**
 * Initialize database - create tables and enable pgvector
 */
export async function initializeDatabase(): Promise<void> {
  console.log('🗄️  Initializing Neon PostgreSQL database...');

  try {
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

    console.log('✅ Database initialized successfully');
    console.log('📊 Tables: portfolios, positions, trades, market_intelligence, embeddings, politician_trades');
    console.log('🔍 pgvector extension enabled for RAG');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    console.log('✅ Neon database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error);
    return false;
  }
}
