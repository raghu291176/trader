const { app } = require('@azure/functions');

app.http('scores', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'scores',
  handler: async (request, context) => {
    try {
      // Mock scores data
      const mockScores = [
        {
          ticker: 'NVDA',
          score: 0.85,
          components: {
            catalyst: 0.65,
            momentum: 0.72,
            upside: 0.45,
            timing: 0.25
          }
        },
        {
          ticker: 'AMD',
          score: 0.78,
          components: {
            catalyst: 0.55,
            momentum: 0.68,
            upside: 0.38,
            timing: 0.20
          }
        },
        {
          ticker: 'SMCI',
          score: 0.72,
          components: {
            catalyst: 0.48,
            momentum: 0.65,
            upside: 0.42,
            timing: 0.15
          }
        }
      ];

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockScores)
      };
    } catch (error) {
      context.error('Error in scores function:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message })
      };
    }
  }
});
