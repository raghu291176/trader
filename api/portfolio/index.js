const { app } = require('@azure/functions');

app.http('portfolio', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'portfolio',
  handler: async (request, context) => {
    try {
      // For now, return mock data
      // TODO: Integrate with UserService and actual portfolio logic
      const mockPortfolio = {
        totalValue: 12500.00,
        cash: 2500.00,
        unrealizedPnL: 500.00,
        unrealizedPnLPercent: 4.17,
        maxDrawdown: -5.2,
        positionCount: 3
      };

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockPortfolio)
      };
    } catch (error) {
      context.error('Error in portfolio function:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }
});
