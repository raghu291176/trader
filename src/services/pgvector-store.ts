/**
 * pgvector Store Service
 * Manages embeddings in Neon PostgreSQL with pgvector
 */

import { neon } from '@neondatabase/serverless';
import { OpenAIEmbeddings } from '@langchain/openai';
import type { Document } from '@langchain/core/documents';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
}

export class PgVectorStore {
  private sql: ReturnType<typeof neon>;
  private embeddings: OpenAIEmbeddings;

  constructor(connectionString: string, azureConfig: AzureOpenAIConfig) {
    this.sql = neon(connectionString);
    this.embeddings = new OpenAIEmbeddings({
      configuration: {
        apiKey: azureConfig.apiKey,
        baseURL: `${azureConfig.endpoint}/openai/deployments/${azureConfig.embeddingDeploymentName || 'text-embedding-ada-002'}`,
        defaultQuery: { 'api-version': azureConfig.apiVersion || '2024-02-15-preview' },
        defaultHeaders: { 'api-key': azureConfig.apiKey },
      },
    } as any);
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    console.log(`📝 Adding ${documents.length} documents to pgvector...`);

    for (const doc of documents) {
      try {
        // Generate embedding
        const embedding = await this.embeddings.embedQuery(doc.pageContent);

        // Convert embedding to pgvector format
        const vectorStr = `[${embedding.join(',')}]`;

        // Insert into database
        await this.sql`
          INSERT INTO trader.embeddings (content, embedding, metadata, type, ticker, timestamp)
          VALUES (
            ${doc.pageContent},
            ${vectorStr}::vector,
            ${JSON.stringify(doc.metadata || {})}::jsonb,
            ${doc.metadata?.type || 'unknown'},
            ${doc.metadata?.ticker || null},
            NOW()
          )
        `;
      } catch (error) {
        console.error(`Failed to add document to pgvector:`, error);
      }
    }

    console.log(`✅ Added ${documents.length} documents to pgvector`);
  }

  /**
   * Search for similar documents using vector similarity
   */
  async similaritySearch(query: string, topK: number = 3): Promise<Document[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);
      const vectorStr = `[${queryEmbedding.join(',')}]`;

      // Search using cosine similarity
      const results = await this.sql`
        SELECT
          content,
          metadata,
          type,
          ticker,
          timestamp,
          1 - (embedding <=> ${vectorStr}::vector) as similarity
        FROM trader.embeddings
        ORDER BY embedding <=> ${vectorStr}::vector
        LIMIT ${topK}
      `;

      return (results as any[]).map(row => ({
        pageContent: row.content,
        metadata: row.metadata || {},
      })) as Document[];
    } catch (error) {
      console.error('Failed to perform similarity search:', error);
      return [];
    }
  }

  /**
   * Get documents by type
   */
  async getDocumentsByType(type: string, limit: number = 10): Promise<Document[]> {
    try {
      const results = await this.sql`
        SELECT content, metadata
        FROM trader.embeddings
        WHERE type = ${type}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return (results as any[]).map(row => ({
        pageContent: row.content,
        metadata: row.metadata || {},
      })) as Document[];
    } catch (error) {
      console.error(`Failed to get documents by type ${type}:`, error);
      return [];
    }
  }

  /**
   * Get documents by ticker
   */
  async getDocumentsByTicker(ticker: string, limit: number = 10): Promise<Document[]> {
    try {
      const results = await this.sql`
        SELECT content, metadata
        FROM trader.embeddings
        WHERE ticker = ${ticker}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return (results as any[]).map(row => ({
        pageContent: row.content,
        metadata: row.metadata || {},
      })) as Document[];
    } catch (error) {
      console.error(`Failed to get documents for ticker ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Clear all embeddings (useful for testing or reset)
   */
  async clear(): Promise<void> {
    await this.sql`DELETE FROM trader.embeddings`;
    console.log('🗑️  Cleared all embeddings from pgvector');
  }

  /**
   * Clear embeddings by type
   */
  async clearByType(type: string): Promise<void> {
    await this.sql`DELETE FROM trader.embeddings WHERE type = ${type}`;
    console.log(`🗑️  Cleared ${type} embeddings from pgvector`);
  }

  /**
   * Get total embedding count
   */
  async getCount(): Promise<number> {
    const result = await this.sql`SELECT COUNT(*) as count FROM trader.embeddings`;
    return result[0]?.count || 0;
  }
}
