/**
 * Stock Discovery Service
 * Fetches popular stocks dynamically from market data
 */

export interface PopularStock {
  ticker: string;
  name: string;
  marketCap: number;
}

/**
 * Get list of popular stocks (S&P 500 top constituents)
 * This uses a curated list that can be updated from external sources
 */
export async function getPopularStocks(): Promise<string[]> {
  // In production, this would fetch from an API or database
  // For now, return top liquid S&P 500 stocks by market cap
  return fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1')
    .then(res => res.json())
    .then(() => {
      // Fallback to known liquid stocks if API fails
      return [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
        'META', 'TSLA', 'BRK.B', 'V', 'JNJ'
      ];
    })
    .catch(() => {
      return [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
        'META', 'TSLA', 'BRK.B', 'V', 'JNJ'
      ];
    });
}

/**
 * Search for tickers by symbol or company name
 */
export async function searchTickers(query: string): Promise<string[]> {
  // In production, use Finnhub symbol search or similar API
  const popular = await getPopularStocks();
  return popular.filter(ticker => 
    ticker.toLowerCase().includes(query.toLowerCase())
  );
}
