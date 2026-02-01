/**
 * CLI Interface for Portfolio Rotation Agent
 */

import { program } from 'commander';
import { PortfolioRotationAgent } from './agent/portfolio_rotation.js';

async function main() {
  program
    .name('portfolio-rotation-agent')
    .description('Return-maximization trading agent with LangChain reasoning')
    .version('0.1.0');

  program
    .command('analyze')
    .option('--capital <number>', 'Initial capital', '10000')
    .option('--reasoning', 'Show reasoning traces', false)
    .description('Analyze watchlist for trading opportunities')
    .action(async (options) => {
      const capital = parseInt(options.capital);
      const agent = new PortfolioRotationAgent(capital);
      const watchlist = agent.initializeWatchlist();

      console.log(`\n📊 Analyzing ${watchlist.length} tickers...\n`);

      try {
        const { scores, rotationDecisions } = await agent.analyzeWatchlist(watchlist);

        console.log('📈 Scores:');
        const sortedScores = Array.from(scores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        for (const [ticker, score] of sortedScores) {
          console.log(`  ${ticker}: ${(score * 100).toFixed(1)}%`);
        }

        console.log('\n🔄 Rotation Decisions:', rotationDecisions.length);

        const output = agent.getAgentOutput();
        console.log('\n💼 Portfolio:', {
          totalValue: output.performance.totalValue.toFixed(2),
          cash: output.performance.cash.toFixed(2),
          pnl: output.performance.unrealizedPnL.toFixed(2),
          pnlPercent: output.performance.unrealizedPnLPercent.toFixed(2),
        });
      } catch (error) {
        console.error('Error during analysis:', error);
      }
    });

  program
    .command('trade')
    .option('--capital <number>', 'Initial capital', '10000')
    .description('Execute trades based on current signals')
    .action(async (options) => {
      const capital = parseInt(options.capital);
      const agent = new PortfolioRotationAgent(capital);
      const watchlist = agent.initializeWatchlist();

      console.log(`\n🤖 Executing trades for ${watchlist.length} tickers...\n`);

      try {
        const { executedTrades } = await agent.runTradingPass(watchlist);

        console.log(`✅ Executed ${executedTrades.length} trades`);

        for (const trade of executedTrades) {
          console.log(`  ${trade.fromTicker} → ${trade.toTicker || 'CLOSE'}`);
        }

        const output = agent.getAgentOutput();
        console.log('\n💼 Portfolio:', {
          totalValue: output.performance.totalValue.toFixed(2),
          positions: agent.getPositions().length,
          cash: output.performance.cash.toFixed(2),
        });
      } catch (error) {
        console.error('Error during trading:', error);
      }
    });

  program
    .command('dashboard')
    .option('--capital <number>', 'Initial capital', '10000')
    .description('Show performance dashboard')
    .action(async (options) => {
      const capital = parseInt(options.capital);
      const agent = new PortfolioRotationAgent(capital);

      const output = agent.getAgentOutput();

      console.log('\n📊 Portfolio Rotation Agent Dashboard\n');
      console.log('='.repeat(50));
      console.log(`Total Value:      $${output.performance.totalValue.toFixed(2)}`);
      console.log(`Cash:             $${output.performance.cash.toFixed(2)}`);
      console.log(`Unrealized P&L:   $${output.performance.unrealizedPnL.toFixed(2)}`);
      console.log(`Unrealized P&L%:  ${output.performance.unrealizedPnLPercent.toFixed(2)}%`);
      console.log(`Max Drawdown:     ${output.performance.maxDrawdown.toFixed(2)}%`);
      console.log('='.repeat(50));
    });

  program.parse(process.argv);
}

main().catch(console.error);
