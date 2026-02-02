const { app } = require('@azure/functions');

app.http('positions', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'positions',
  handler: async (request, context) => {
    try {
      // Mock positions data
      const mockPositions = [
        {
          ticker: 'NVDA',
          shares: 5,
          entryPrice: 450.00,
          currentPrice: 475.00,
          entryScore: 0.85,
          unrealizedPnL: 125.00,
          unrealizedPnLPercent: 5.56,
          value: 2375.00,
          entryTimestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          ticker: 'AMD',
          shares: 10,
          entryPrice: 180.00,
          currentPrice: 185.00,
          entryScore: 0.78,
          unrealizedPnL: 50.00,
          unrealizedPnLPercent: 2.78,
          value: 1850.00,
          entryTimestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPositions)
      };
    } catch (error) {
      context.error('Error in positions function:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }
});
