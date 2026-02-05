/**
 * RAG-Powered Chat Service for Portfolio Analysis
 * Uses LangChain + Vector Store for context-aware Q&A
 */

import { AzureChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PromptTemplate } from '@langchain/core/prompts';
import { PortfolioRotationAgent } from '../agent/portfolio_rotation.js';
import { MarketIntelligenceService } from './market-intelligence.js';
import { PgVectorStore } from './pgvector-store.js';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { PublicSourcesSearchService } from './public-sources-search.js';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
}

export class ChatService {
  private llm: AzureChatOpenAI;
  private vectorStore: PgVectorStore;
  private agent: PortfolioRotationAgent;
  private marketIntel: MarketIntelligenceService;
  private azureConfig: AzureOpenAIConfig;
  private publicSourcesSearch: PublicSourcesSearchService;

  constructor(
    agent: PortfolioRotationAgent,
    azureConfig: AzureOpenAIConfig,
    databaseUrl: string,
    finnhubApiKey: string
  ) {
    this.agent = agent;
    this.azureConfig = azureConfig;
    this.vectorStore = new PgVectorStore(databaseUrl, azureConfig);
    this.llm = new AzureChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIEndpoint: azureConfig.endpoint,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      azureOpenAIApiVersion: azureConfig.apiVersion || '2024-02-15-preview',
      temperature: 0.7,
    });
    this.marketIntel = new MarketIntelligenceService(azureConfig);
    this.publicSourcesSearch = new PublicSourcesSearchService(finnhubApiKey);
  }

  /**
   * Initialize RAG system with portfolio context + market intelligence
   */
  async initialize(): Promise<void> {
    console.log('📚 Initializing RAG system with pgvector...');

    // Start continuous market intelligence updates (every hour)
    await this.marketIntel.startContinuousUpdates(60 * 60 * 1000);

    // Create documents from current portfolio state
    const documents = await this.createContextDocuments();

    // Add market intelligence documents
    const intelDocs = await this.marketIntel.getIntelligenceDocuments();
    documents.push(...intelDocs);

    console.log(`📚 Adding ${documents.length} documents to pgvector (portfolio + market intel)`);

    // Clear old portfolio/market intel docs and add new ones
    await this.vectorStore.clearByType('portfolio_overview');
    await this.vectorStore.clearByType('position');
    await this.vectorStore.clearByType('trade');
    await this.vectorStore.clearByType('strategy');
    await this.vectorStore.clearByType('risk');
    await this.vectorStore.clearByType('indicators');
    await this.vectorStore.clearByType('analyst_report');
    await this.vectorStore.clearByType('market_news');

    // Add documents to pgvector
    await this.vectorStore.addDocuments(documents);

    console.log(`✅ RAG Initialized with ${await this.vectorStore.getCount()} total embeddings`);
  }

  /**
   * Create contextual documents from portfolio state
   */
  private async createContextDocuments(): Promise<Document[]> {
    const output = this.agent.getAgentOutput();
    const documents: Document[] = [];

    // Portfolio Overview Document
    documents.push(new Document({
      pageContent: `Portfolio Overview:
- Total Value: $${output.performance.totalValue.toFixed(2)}
- Cash Available: $${output.performance.cash.toFixed(2)}
- Unrealized P&L: $${output.performance.unrealizedPnL.toFixed(2)} (${output.performance.unrealizedPnLPercent.toFixed(2)}%)
- Max Drawdown: ${output.performance.maxDrawdown.toFixed(2)}%
- Active Positions: ${this.agent.getPositions().length}`,
      metadata: { type: 'portfolio_overview' },
    }));

    // Positions Documents
    const positions = this.agent.getPositions();
    for (const pos of positions) {
      documents.push(new Document({
        pageContent: `Position in ${pos.ticker}:
- Shares: ${pos.shares}
- Entry Price: $${pos.entryPrice.toFixed(2)}
- Current Price: $${pos.currentPrice.toFixed(2)}
- Entry Score: ${pos.entryScore.toFixed(3)}
- Unrealized P&L: $${pos.getUnrealizedPnL().toFixed(2)} (${pos.getUnrealizedPnLPercent().toFixed(2)}%)
- Position Value: $${pos.getValue().toFixed(2)}
- Entry Date: ${pos.entryTimestamp.toISOString()}`,
        metadata: { type: 'position', ticker: pos.ticker },
      }));
    }

    // Recent Trades Documents
    const trades = output.trades.slice(-10);
    for (const trade of trades) {
      documents.push(new Document({
        pageContent: `Trade ${trade.type} ${trade.ticker}:
- Timestamp: ${trade.timestamp.toISOString()}
- Shares: ${trade.shares}
- Price: $${trade.price.toFixed(2)}
- Total: $${(trade.price * trade.shares).toFixed(2)}
- Reason: ${trade.reason || 'N/A'}
- Score at Entry: ${trade.score?.toFixed(3) || 'N/A'}`,
        metadata: { type: 'trade', ticker: trade.ticker },
      }));
    }

    // Scoring Strategy Document
    documents.push(new Document({
      pageContent: `Scoring Formula (PRD Section 4):
Expected Return Score = 40% Catalyst + 30% Momentum + 20% Upside + 10% Timing

Components:
- Catalyst Score [0-1]: Aggregated signal strength from technical indicators (RSI crossovers, MACD bullish, volume spikes, etc.)
- Momentum Score [-1,1]: Rate of change in RSI and MACD histogram (measures acceleration)
- Upside Score [0-1]: Potential gain based on analyst target price vs current price
- Timing Factor [-0.5,0.5]: Discrete buckets based on RSI ranges:
  * RSI 40-60 + MACD bullish: +0.5 (early entry)
  * RSI 60-70 + MACD positive: +0.25 (momentum continuing)
  * RSI 70-75: 0 (neutral, getting extended)
  * RSI >75 or MACD weakening: -0.5 (overbought)`,
      metadata: { type: 'strategy' },
    }));

    // Risk Controls Document
    documents.push(new Document({
      pageContent: `Risk Management (PRD Section 8):
- Stop Loss: -15% per position (automatic exit)
- Circuit Breaker: -30% max drawdown from peak (pauses all trading)
- Rotation Threshold: 0.02 (2% score differential triggers rotation)
- Position Sizing: Kelly-inspired formula: 50% base + (score × 40%), capped at 90%
- Minimum Cash Reserve: $10 maintained for next trade`,
      metadata: { type: 'risk' },
    }));

    // Technical Indicators Document
    documents.push(new Document({
      pageContent: `Technical Indicators Used:
- RSI (Relative Strength Index): 14-period, measures momentum (0-100 scale)
  * <30 = Oversold (potential bounce)
  * 40-60 = Early entry zone
  * >70 = Overbought (extended)
- MACD (Moving Average Convergence Divergence): 12/26/9 periods
  * Histogram > 0 = Bullish momentum
  * Histogram < 0 = Bearish momentum
  * Bullish crossover when MACD line crosses above signal line
- Volume Ratio: Current volume / 20-day average
  * >2.0 = Volume spike (strong interest)
  * <0.5 = Low volume (weak interest)`,
      metadata: { type: 'indicators' },
    }));

    return documents;
  }

  /**
   * Answer a user question using RAG + Public Sources
   */
  async ask(question: string, ticker?: string): Promise<{ answer: string; sources: string[] }> {
    console.log(`📝 Answering question: "${question}"${ticker ? ` (ticker: ${ticker})` : ''}`);

    // Ensure vector store is initialized
    if (await this.vectorStore.getCount() === 0) {
      await this.initialize();
    }

    // Search internal RAG database
    const relevantDocs = await this.vectorStore.similaritySearch(question, 5);

    // Search public sources
    console.log('🔍 Searching public sources...');
    const publicSources = await this.publicSourcesSearch.search(question, ticker);

    // Build context from internal documents
    const internalContext = relevantDocs
      .map(doc => `[Internal Data] ${doc.pageContent}`)
      .join('\n\n---\n\n');

    // Build context from public sources
    const publicContext = publicSources
      .map(source => `[${source.type} - ${source.source}] ${source.content}`)
      .join('\n\n---\n\n');

    // Combine contexts
    const fullContext = `## Internal Portfolio Data:\n${internalContext}\n\n## Public Market Data:\n${publicContext}`;

    // Create enhanced prompt
    const prompt = `You are an expert financial analyst assistant for a Portfolio Rotation Trading Agent.

Use the following context to answer the user's question. The context includes both internal portfolio data and real-time public market information from news, analyst reports, and market data providers.

${fullContext}

Question: ${question}

Provide a comprehensive, data-driven answer that:
1. Synthesizes information from both internal portfolio data and public sources
2. Cites specific numbers, metrics, and sources
3. Explains technical indicators (RSI, MACD, catalysts) in simple terms when relevant
4. Provides actionable insights backed by recent market data
5. Notes the timestamp/recency of information when relevant
6. Keeps responses clear and concise (2-4 paragraphs)

IMPORTANT: Always cite your sources using the format [source_type - source_name] when referencing specific data points.

Answer:`;

    // Get answer from LLM
    const response = await this.llm.invoke(prompt);
    const answer = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Compile sources (internal + public)
    const internalSources = relevantDocs.map(doc =>
      `[Internal] ${doc.metadata.type || 'portfolio_data'}: ${doc.pageContent.split('\n')[0]}`
    );

    const publicSourcesList = this.publicSourcesSearch.formatSources(publicSources);

    const allSources = [...publicSourcesList, ...internalSources];

    console.log(`✅ Generated answer with ${allSources.length} sources (${publicSources.length} public, ${internalSources.length} internal)`);

    return {
      answer,
      sources: allSources,
    };
  }

  /**
   * Get suggested questions based on current portfolio state
   */
  getSuggestedQuestions(): string[] {
    const positions = this.agent.getPositions();
    const suggestions: string[] = [];

    if (positions.length > 0) {
      suggestions.push(`Why is ${positions[0].ticker} in my portfolio?`);
      suggestions.push("What's my current risk exposure?");
    }

    suggestions.push("Explain my portfolio's performance");
    suggestions.push("What catalysts are you watching?");
    suggestions.push("How does the scoring system work?");
    suggestions.push("What should I know about my positions?");

    return suggestions;
  }
}
