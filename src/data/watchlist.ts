/**
 * Watchlist management
 */

export interface Watchlist {
  name: string;
  tickers: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class WatchlistManager {
  private watchlists: Map<string, Watchlist> = new Map();

  /**
   * Create or get a watchlist
   */
  getOrCreate(name: string): Watchlist {
    if (!this.watchlists.has(name)) {
      this.watchlists.set(name, {
        name,
        tickers: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return this.watchlists.get(name)!;
  }

  /**
   * Add ticker to watchlist
   */
  addTicker(name: string, ticker: string): void {
    const watchlist = this.getOrCreate(name);
    if (!watchlist.tickers.includes(ticker.toUpperCase())) {
      watchlist.tickers.push(ticker.toUpperCase());
      watchlist.updatedAt = new Date();
    }
  }

  /**
   * Remove ticker from watchlist
   */
  removeTicker(name: string, ticker: string): void {
    const watchlist = this.getOrCreate(name);
    watchlist.tickers = watchlist.tickers.filter(
      (t) => t !== ticker.toUpperCase()
    );
    watchlist.updatedAt = new Date();
  }

  /**
   * Get all tickers in watchlist
   */
  getTickers(name: string): string[] {
    return this.getOrCreate(name).tickers;
  }

  /**
   * Load seed watchlist (default high-beta tickers)
   */
  loadSeedWatchlist(name: string = 'default'): string[] {
    const tickers = [
      'NVDA', // Nvidia - AI/semiconductors
      'AMD', // AMD - semiconductors
      'SMCI', // Super Micro - data center
      'AVGO', // Broadcom - semiconductors
      'MRVL', // Marvell - semiconductors
      'TSLA', // Tesla - momentum play
      'RIVN', // Rivian - EV moonshot
      'PLTR', // Palantir - speculative
      'CRWD', // CrowdStrike - cybersecurity
      'NET', // Cloudflare - cloud/CDN
      'DDOG', // Datadog - monitoring/SaaS
      'ANET', // Arista - networking
      'PANW', // Palo Alto - security
      'COIN', // Coinbase - crypto exposure
      'MSTR', // MicroStrategy - Bitcoin proxy
    ];

    for (const ticker of tickers) {
      this.addTicker(name, ticker);
    }

    return tickers;
  }
}
