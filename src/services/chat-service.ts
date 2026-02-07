/**
 * RAG-Powered Chat Service for Portfolio Analysis
 * Uses LangChain + Vector Store for context-aware Q&A
 * Integrates: Trading, Portfolio, Market Data, Technicals, Politician Trades
 */

import { AzureChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PortfolioRotationAgent } from '../agent/portfolio_rotation.js';
import { MarketIntelligenceService } from './market-intelligence.js';
import { PgVectorStore } from './pgvector-store.js';
import { PublicSourcesSearchService } from './public-sources-search.js';
import { FinnhubService } from './finnhub-service.js';
import { TechnicalIndicatorsService } from './technical-indicators.js';
import { PoliticianTradesDatabase } from './politician-trades-db.js';
import { MarketData } from '../data/market_data.js';

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  deploymentName: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
}

export interface ChatAction {
  type: 'buy' | 'sell' | 'analyze' | 'rebalance';
  ticker?: string;
  label: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  actions?: ChatAction[];
}

export class ChatService {
  private llm: AzureChatOpenAI;
  private vectorStore: PgVectorStore;
  private defaultAgent: PortfolioRotationAgent;
  private marketIntel: MarketIntelligenceService;
  private azureConfig: AzureOpenAIConfig;
  private publicSourcesSearch: PublicSourcesSearchService;
  private finnhub: FinnhubService;
  private technicals: TechnicalIndicatorsService;
  private politicianTradesDb: PoliticianTradesDatabase | null;
  private marketData: MarketData;
  private stockDataIngestion: any;
  private initialized = false;

  constructor(
    agent: PortfolioRotationAgent,
    azureConfig: AzureOpenAIConfig,
    databaseUrl: string,
    finnhubApiKey: string,
    options?: {
      stockDataIngestionService?: any;
    }
  ) {
    this.defaultAgent = agent;
    this.azureConfig = azureConfig;
    this.vectorStore = new PgVectorStore(databaseUrl, azureConfig);
    this.llm = new AzureChatOpenAI({
      azureOpenAIApiKey: azureConfig.apiKey,
      azureOpenAIEndpoint: azureConfig.endpoint,
      azureOpenAIApiDeploymentName: azureConfig.deploymentName,
      azureOpenAIApiVersion: azureConfig.apiVersion || '2024-02-15-preview',
    });
    this.marketIntel = new MarketIntelligenceService(azureConfig);
    this.publicSourcesSearch = new PublicSourcesSearchService(finnhubApiKey);
    this.finnhub = new FinnhubService(finnhubApiKey);
    this.technicals = new TechnicalIndicatorsService();
    this.marketData = new MarketData();
    this.stockDataIngestion = options?.stockDataIngestionService || null;

    // Initialize politician trades DB if we have a database URL
    try {
      this.politicianTradesDb = new PoliticianTradesDatabase(databaseUrl);
    } catch {
      this.politicianTradesDb = null;
    }
  }

  /**
   * Initialize RAG system with portfolio context + market intelligence
   */
  async initialize(agent?: PortfolioRotationAgent): Promise<void> {
    console.log('📚 Initializing RAG system with pgvector...');

    // Start continuous market intelligence updates (every hour)
    await this.marketIntel.startContinuousUpdates(60 * 60 * 1000);

    const activeAgent = agent || this.defaultAgent;

    // Create documents from current portfolio state
    const documents = await this.createContextDocuments(activeAgent);

    // Add market intelligence documents
    const intelDocs = await this.marketIntel.getIntelligenceDocuments();
    documents.push(...intelDocs);

    console.log(`📚 Adding ${documents.length} documents to pgvector (portfolio + market intel + services)`);

    // Clear old docs and add new ones
    const typesToClear = [
      'portfolio_overview', 'position', 'trade', 'strategy', 'risk',
      'indicators', 'analyst_report', 'market_news', 'technical_analysis',
      'analyst_sentiment', 'politician_trades', 'stock_snapshot',
    ];
    for (const type of typesToClear) {
      await this.vectorStore.clearByType(type);
    }

    // Add documents to pgvector
    await this.vectorStore.addDocuments(documents);
    this.initialized = true;

    console.log(`✅ RAG Initialized with ${await this.vectorStore.getCount()} total embeddings`);
  }

  /**
   * Create contextual documents from portfolio state + all integrated services
   */
  private async createContextDocuments(agent: PortfolioRotationAgent): Promise<Document[]> {
    const output = agent.getAgentOutput();
    const documents: Document[] = [];

    // Portfolio Overview Document
    documents.push(new Document({
      pageContent: `Portfolio Overview:
- Total Value: $${output.performance.totalValue.toFixed(2)}
- Cash Available: $${output.performance.cash.toFixed(2)}
- Unrealized P&L: $${output.performance.unrealizedPnL.toFixed(2)} (${output.performance.unrealizedPnLPercent.toFixed(2)}%)
- Max Drawdown: ${output.performance.maxDrawdown.toFixed(2)}%
- Active Positions: ${agent.getPositions().length}`,
      metadata: { type: 'portfolio_overview' },
    }));

    // Positions Documents
    const positions = agent.getPositions();
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

    // Technical Indicators Reference
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

    // === ENRICHED CONTEXT FROM INTEGRATED SERVICES ===

    // Fetch real-time technical indicators for held positions + top watchlist
    const tickersToAnalyze = [
      ...positions.map(p => p.ticker),
      ...Array.from(output.state.scores?.keys() || []).slice(0, 5),
    ];
    const uniqueTickers = [...new Set(tickersToAnalyze)].slice(0, 10);

    // Fetch technical analysis, analyst sentiment, and politician trades in parallel
    const enrichmentPromises = uniqueTickers.map(async (ticker) => {
      const docs: Document[] = [];

      // Technical Analysis
      try {
        const candles = await this.marketData.fetchCandles(ticker, 30);
        if (candles.prices.length > 0) {
          const priceData = candles.prices.map((price: number, i: number) => ({
            timestamp: candles.dates[i]?.getTime() || Date.now(),
            open: price,
            high: price * 1.01,
            low: price * 0.99,
            close: price,
            volume: candles.volumes?.[i] || 0,
          }));
          const indicators = this.technicals.calculateAllIndicators(priceData);
          docs.push(new Document({
            pageContent: `Technical Analysis for ${ticker}:
- RSI: ${indicators.rsi.value.toFixed(1)} (${indicators.rsi.signal})
- MACD: ${indicators.macd.macd.toFixed(3)} / Signal: ${indicators.macd.signal.toFixed(3)} / Histogram: ${indicators.macd.histogram.toFixed(3)} (${indicators.macd.trend})
- Bollinger Bands: Upper $${indicators.bollinger.upper.toFixed(2)}, Middle $${indicators.bollinger.middle.toFixed(2)}, Lower $${indicators.bollinger.lower.toFixed(2)} (%B: ${indicators.bollinger.percentB.toFixed(2)})
- Stochastic: K=${indicators.stochastic.k.toFixed(1)}, D=${indicators.stochastic.d.toFixed(1)} (${indicators.stochastic.signal})
- Overall Trend: ${indicators.trend}, Strength: ${indicators.strength}/100`,
            metadata: { type: 'technical_analysis', ticker },
          }));
        }
      } catch (err) {
        // Skip if technical data unavailable
      }

      // Analyst Sentiment
      try {
        const recs = await this.finnhub.getRecommendations(ticker);
        if (recs.length > 0) {
          const latest = recs[0];
          const total = latest.strongBuy + latest.buy + latest.hold + latest.sell + latest.strongSell;
          const bullish = total > 0 ? ((latest.strongBuy + latest.buy) / total * 100).toFixed(0) : '0';
          const priceTarget = await this.finnhub.getPriceTarget(ticker);

          let targetInfo = '';
          if (priceTarget) {
            targetInfo = `\n- Price Target: Mean $${priceTarget.targetMean.toFixed(2)}, High $${priceTarget.targetHigh.toFixed(2)}, Low $${priceTarget.targetLow.toFixed(2)}`;
          }

          docs.push(new Document({
            pageContent: `Analyst Sentiment for ${ticker} (${latest.period}):
- Strong Buy: ${latest.strongBuy}, Buy: ${latest.buy}, Hold: ${latest.hold}, Sell: ${latest.sell}, Strong Sell: ${latest.strongSell}
- Bullish Consensus: ${bullish}% (${total} analysts)${targetInfo}`,
            metadata: { type: 'analyst_sentiment', ticker },
          }));
        }
      } catch (err) {
        // Skip if analyst data unavailable
      }

      // Politician Trades
      if (this.politicianTradesDb) {
        try {
          const polTrades = await this.politicianTradesDb.getTradesForTicker(ticker, 5);
          if (polTrades.length > 0) {
            const signal = await this.politicianTradesDb.getTickerSignal(ticker, 90);
            const tradesList = polTrades.slice(0, 3).map(t =>
              `  ${t.politician} (${t.party}) ${t.tradeType} ${t.amount || 'undisclosed'} on ${t.transactionDate.toISOString().split('T')[0]}`
            ).join('\n');

            docs.push(new Document({
              pageContent: `Politician Trading Activity for ${ticker}:
- Signal Score: ${(signal * 100).toFixed(0)}% bullish (90-day window)
- Recent Trades:
${tradesList}`,
              metadata: { type: 'politician_trades', ticker },
            }));
          }
        } catch (err) {
          // Skip if politician data unavailable
        }
      }

      // Stock Snapshot (real-time data from ingestion service)
      if (this.stockDataIngestion) {
        try {
          const snapshot = await this.stockDataIngestion.getLatestSnapshot(ticker);
          if (snapshot) {
            docs.push(new Document({
              pageContent: `Real-Time Snapshot for ${ticker}:
- Price: $${snapshot.currentPrice?.toFixed(2) || 'N/A'}
- Change: ${snapshot.priceChange >= 0 ? '+' : ''}${snapshot.priceChange?.toFixed(2) || '0'} (${snapshot.priceChangePercent?.toFixed(2) || '0'}%)
- Market Cap: $${snapshot.metrics?.marketCapitalization ? (snapshot.metrics.marketCapitalization / 1e9).toFixed(1) + 'B' : 'N/A'}
- P/E Ratio: ${snapshot.metrics?.peBasicExclExtraTTM?.toFixed(1) || 'N/A'}
- 52W High: $${snapshot.metrics?.['52WeekHigh']?.toFixed(2) || 'N/A'}
- 52W Low: $${snapshot.metrics?.['52WeekLow']?.toFixed(2) || 'N/A'}
- Sentiment: ${snapshot.sentiment?.toFixed(2) || 'N/A'}`,
              metadata: { type: 'stock_snapshot', ticker },
            }));
          }
        } catch (err) {
          // Skip if snapshot unavailable
        }
      }

      return docs;
    });

    const enrichedDocArrays = await Promise.all(enrichmentPromises);
    for (const docs of enrichedDocArrays) {
      documents.push(...docs);
    }

    // Top politician-traded tickers (global view)
    if (this.politicianTradesDb) {
      try {
        const topPolTickers = await this.politicianTradesDb.getTopTickers(30, 10);
        if (topPolTickers.length > 0) {
          const tickerList = topPolTickers.map(t =>
            `  ${t.ticker}: ${t.buyCount} buys, ${t.sellCount} sells (signal: ${(t.signal * 100).toFixed(0)}% bullish)`
          ).join('\n');

          documents.push(new Document({
            pageContent: `Top Politician-Traded Stocks (Last 30 Days):
${tickerList}`,
            metadata: { type: 'politician_trades' },
          }));
        }
      } catch (err) {
        // Skip if unavailable
      }
    }

    return documents;
  }

  /**
   * Answer a user question using RAG + Public Sources + All Integrated Services
   */
  async ask(
    question: string,
    options?: { ticker?: string; agent?: PortfolioRotationAgent }
  ): Promise<ChatResponse> {
    const ticker = options?.ticker;
    const agent = options?.agent || this.defaultAgent;

    console.log(`📝 Answering question: "${question}"${ticker ? ` (ticker: ${ticker})` : ''}`);

    // Re-initialize with user's agent to get their portfolio context
    if (!this.initialized || options?.agent) {
      await this.initialize(agent);
    }

    // Search internal RAG database
    const relevantDocs = await this.vectorStore.similaritySearch(question, 8);

    // Search public sources
    console.log('🔍 Searching public sources...');
    const publicSources = await this.publicSourcesSearch.search(question, ticker);

    // Build context from internal documents
    const internalContext = relevantDocs
      .map(doc => `[Internal Data - ${doc.metadata.type || 'general'}${doc.metadata.ticker ? ` (${doc.metadata.ticker})` : ''}] ${doc.pageContent}`)
      .join('\n\n---\n\n');

    // Build context from public sources
    const publicContext = publicSources
      .map(source => `[${source.type} - ${source.source}] ${source.content}`)
      .join('\n\n---\n\n');

    // Build live portfolio summary for the prompt
    const positions = agent.getPositions();
    const output = agent.getAgentOutput();
    const portfolioSummary = `Current Portfolio: $${output.performance.totalValue.toFixed(0)} total, $${output.performance.cash.toFixed(0)} cash, ${positions.length} positions${positions.length > 0 ? ' (' + positions.map((p: any) => p.ticker).join(', ') + ')' : ''}`;

    // Combine contexts
    const fullContext = `## Live Portfolio State:\n${portfolioSummary}\n\n## Internal Portfolio & Market Data:\n${internalContext}\n\n## Public Market Data:\n${publicContext}`;

    // Create enhanced prompt with action support
    const prompt = `You are an expert financial analyst and trading assistant for a Portfolio Rotation Trading Agent. You have access to the user's live portfolio, technical indicators, analyst ratings, politician trading signals, and real-time market data.

${fullContext}

Question: ${question}

Provide a comprehensive, data-driven answer that:
1. Synthesizes information from portfolio data, technical analysis, analyst sentiment, and market data
2. Cites specific numbers, metrics, and sources
3. Explains technical indicators (RSI, MACD, Bollinger, catalysts) in practical terms
4. Provides actionable insights - recommend specific actions when appropriate
5. References politician trading activity when relevant to the question
6. Notes analyst consensus and price targets when discussing specific stocks
7. Keeps responses clear and concise (2-4 paragraphs)

When you recommend an action (buy, sell, analyze a stock, or rebalance), include it as a clear recommendation.
If suggesting to buy a stock, mention the ticker clearly with "recommend buying [TICKER]".
If suggesting to sell, mention "recommend selling [TICKER]".
If suggesting analysis, mention "recommend analyzing [TICKER]".
If suggesting portfolio rebalance, mention "recommend rebalancing".

IMPORTANT: Always cite your sources using the format [source_type - source_name] when referencing specific data points.

Answer:`;

    // Get answer from LLM
    const response = await this.llm.invoke(prompt);
    const answer = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Parse actions from the answer
    const actions = this.parseActions(answer);

    // Compile sources (internal + public)
    const internalSources = relevantDocs.map(doc =>
      `[Internal] ${doc.metadata.type || 'portfolio_data'}${doc.metadata.ticker ? ` (${doc.metadata.ticker})` : ''}: ${doc.pageContent.split('\n')[0]}`
    );

    const publicSourcesList = this.publicSourcesSearch.formatSources(publicSources);

    const allSources = [...publicSourcesList, ...internalSources];

    console.log(`✅ Generated answer with ${allSources.length} sources (${publicSources.length} public, ${internalSources.length} internal), ${actions.length} actions`);

    return {
      answer,
      sources: allSources,
      actions,
    };
  }

  /**
   * Parse actionable recommendations from the LLM response
   */
  private parseActions(answer: string): ChatAction[] {
    const actions: ChatAction[] = [];
    const lowerAnswer = answer.toLowerCase();

    // Match "recommend buying TICKER" patterns
    const buyMatches = answer.match(/recommend(?:s|ing)?\s+buy(?:ing)?\s+(\w{1,5})/gi);
    if (buyMatches) {
      for (const match of buyMatches) {
        const ticker = match.replace(/recommend(?:s|ing)?\s+buy(?:ing)?\s+/i, '').toUpperCase();
        if (ticker.length >= 1 && ticker.length <= 5 && !actions.find(a => a.ticker === ticker && a.type === 'buy')) {
          actions.push({ type: 'buy', ticker, label: `Buy ${ticker}` });
        }
      }
    }

    // Match "recommend selling TICKER" patterns
    const sellMatches = answer.match(/recommend(?:s|ing)?\s+sell(?:ing)?\s+(\w{1,5})/gi);
    if (sellMatches) {
      for (const match of sellMatches) {
        const ticker = match.replace(/recommend(?:s|ing)?\s+sell(?:ing)?\s+/i, '').toUpperCase();
        if (ticker.length >= 1 && ticker.length <= 5 && !actions.find(a => a.ticker === ticker && a.type === 'sell')) {
          actions.push({ type: 'sell', ticker, label: `Sell ${ticker}` });
        }
      }
    }

    // Match "recommend analyzing TICKER" patterns
    const analyzeMatches = answer.match(/recommend(?:s|ing)?\s+analyz(?:e|ing)\s+(\w{1,5})/gi);
    if (analyzeMatches) {
      for (const match of analyzeMatches) {
        const ticker = match.replace(/recommend(?:s|ing)?\s+analyz(?:e|ing)\s+/i, '').toUpperCase();
        if (ticker.length >= 1 && ticker.length <= 5 && !actions.find(a => a.ticker === ticker && a.type === 'analyze')) {
          actions.push({ type: 'analyze', ticker, label: `Analyze ${ticker}` });
        }
      }
    }

    // Match rebalance recommendation
    if (lowerAnswer.includes('recommend rebalancing') || lowerAnswer.includes('recommend a rebalance')) {
      actions.push({ type: 'rebalance', label: 'Rebalance Portfolio' });
    }

    return actions;
  }

  /**
   * Get suggested questions based on current portfolio state
   */
  getSuggestedQuestions(agent?: PortfolioRotationAgent): string[] {
    const activeAgent = agent || this.defaultAgent;
    const positions = activeAgent.getPositions();
    const suggestions: string[] = [];

    if (positions.length > 0) {
      suggestions.push(`Why is ${positions[0].ticker} in my portfolio?`);
      suggestions.push("What's my current risk exposure?");
      suggestions.push("Which positions should I consider selling?");
    }

    suggestions.push("What are the best stocks to buy right now?");
    suggestions.push("What are politicians trading this month?");
    suggestions.push("Explain my portfolio's performance");
    suggestions.push("What catalysts are you watching?");
    suggestions.push("Show me the technical analysis for my holdings");

    return suggestions;
  }
}
