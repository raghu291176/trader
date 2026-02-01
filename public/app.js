/**
 * Frontend logic for Portfolio Rotation Agent Dashboard
 */

const API_BASE = 'http://localhost:3000/api';

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
}

// Format percentage
function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

// Format timestamp
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

// Update portfolio overview
async function updatePortfolio() {
    try {
        const response = await fetch(`${API_BASE}/portfolio`);
        const data = await response.json();

        document.getElementById('totalValue').textContent = formatCurrency(data.totalValue);
        document.getElementById('cash').textContent = formatCurrency(data.cash);

        const pnlElement = document.getElementById('unrealizedPnL');
        pnlElement.textContent = formatCurrency(data.unrealizedPnL);
        pnlElement.className = 'stat-value ' + (data.unrealizedPnL >= 0 ? 'positive' : 'negative');

        const pnlPercentElement = document.getElementById('unrealizedPnLPercent');
        pnlPercentElement.textContent = formatPercent(data.unrealizedPnLPercent);
        pnlPercentElement.className = 'stat-percent ' + (data.unrealizedPnL >= 0 ? 'positive' : 'negative');

        document.getElementById('maxDrawdown').textContent = formatPercent(data.maxDrawdown);
        document.getElementById('positionCount').textContent = data.positionCount;

        document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error('Error updating portfolio:', error);
    }
}

// Update positions table
async function updatePositions() {
    try {
        const response = await fetch(`${API_BASE}/positions`);
        const positions = await response.json();

        const tbody = document.getElementById('positionsBody');

        if (positions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">No active positions</td></tr>';
            return;
        }

        tbody.innerHTML = positions.map(pos => `
            <tr>
                <td><strong>${pos.ticker}</strong></td>
                <td>${pos.shares}</td>
                <td>${formatCurrency(pos.entryPrice)}</td>
                <td>${formatCurrency(pos.currentPrice)}</td>
                <td class="${pos.unrealizedPnL >= 0 ? 'trade-buy' : 'trade-sell'}">
                    ${formatCurrency(pos.unrealizedPnL)}
                </td>
                <td class="${pos.unrealizedPnLPercent >= 0 ? 'trade-buy' : 'trade-sell'}">
                    ${formatPercent(pos.unrealizedPnLPercent)}
                </td>
                <td>${formatCurrency(pos.value)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating positions:', error);
    }
}

// Update scores table
async function updateScores() {
    try {
        const response = await fetch(`${API_BASE}/scores`);
        const scores = await response.json();

        const tbody = document.getElementById('scoresBody');

        if (scores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">No scores available</td></tr>';
            return;
        }

        tbody.innerHTML = scores.slice(0, 10).map((item, index) => {
            const scoreClass = item.score >= 0.7 ? 'score-high' : item.score >= 0.4 ? 'score-medium' : 'score-low';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${item.ticker}</strong></td>
                    <td><span class="score-badge ${scoreClass}">${(item.score * 100).toFixed(1)}%</span></td>
                    <td>${(item.components.catalystScore * 100).toFixed(1)}%</td>
                    <td>${(item.components.momentumScore * 100).toFixed(1)}%</td>
                    <td>${(item.components.upsideScore * 100).toFixed(1)}%</td>
                    <td>${(item.components.timingScore * 100).toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error updating scores:', error);
    }
}

// Update trades table
async function updateTrades() {
    try {
        const response = await fetch(`${API_BASE}/trades`);
        const trades = await response.json();

        const tbody = document.getElementById('tradesBody');

        if (trades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty">No trades executed yet</td></tr>';
            return;
        }

        tbody.innerHTML = trades.slice(-20).reverse().map(trade => `
            <tr>
                <td>${formatTime(trade.timestamp)}</td>
                <td class="${trade.type.includes('BUY') ? 'trade-buy' : 'trade-sell'}">
                    ${trade.type}
                </td>
                <td><strong>${trade.ticker}</strong></td>
                <td>${trade.shares}</td>
                <td>${formatCurrency(trade.price)}</td>
                <td>${formatCurrency(trade.price * trade.shares)}</td>
                <td>${trade.reason || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating trades:', error);
    }
}

// Analyze watchlist
async function analyzeWatchlist() {
    try {
        const button = event.target;
        button.disabled = true;
        button.textContent = '🔍 Analyzing...';

        await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                watchlist: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'INTC', 'CRM']
            })
        });

        await updateScores();
        await updatePortfolio();

        button.disabled = false;
        button.textContent = '🔍 Analyze Watchlist';
    } catch (error) {
        console.error('Error analyzing watchlist:', error);
        alert('Failed to analyze watchlist: ' + error.message);
    }
}

// Execute rotation
async function executeRotation() {
    if (!confirm('Execute rotation decisions? This will trade with your portfolio.')) {
        return;
    }

    try {
        const button = event.target;
        button.disabled = true;
        button.textContent = '⚡ Executing...';

        await fetch(`${API_BASE}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        await refreshDashboard();

        button.disabled = false;
        button.textContent = '⚡ Execute Rotation';
    } catch (error) {
        console.error('Error executing rotation:', error);
        alert('Failed to execute rotation: ' + error.message);
    }
}

// Refresh entire dashboard
async function refreshDashboard() {
    await Promise.all([
        updatePortfolio(),
        updatePositions(),
        updateScores(),
        updateTrades()
    ]);
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    refreshDashboard();

    // Auto-refresh every 30 seconds
    setInterval(refreshDashboard, 30000);
});
