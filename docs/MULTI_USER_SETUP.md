# Multi-User Setup Guide

## Overview

The Portfolio Rotation Agent now supports **multi-user authentication** using [Clerk](https://clerk.com), making it production-ready for your entire family to use. Each user gets their own:

- **Isolated portfolio** with separate capital and positions
- **Custom watchlists** for tracking different stocks
- **Private trade history** and performance metrics
- **User-specific settings** and preferences

## Architecture

### Database Schema

All tables now include a `user_id` column for multi-tenancy:

- `trader.users` - User profiles and settings
- `trader.portfolios` - User-specific portfolio states
- `trader.positions` - User-specific active positions
- `trader.trades` - User-specific trade history
- `trader.watchlists` - User-specific stock watchlists
- `trader.embeddings` - User-specific RAG context (optional)

### Authentication Flow

1. User signs in via Clerk (email, Google, Apple, etc.)
2. Clerk middleware validates JWT token
3. `getUserId()` extracts user ID from request
4. `UserService` creates/retrieves user-specific agent
5. All operations are scoped to that user

## Setup Instructions

### 1. Create Clerk Account

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Choose authentication providers (Email, Google, GitHub, etc.)
4. Note your API keys from the Dashboard

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_your-publishable-key
CLERK_SECRET_KEY=sk_test_your-secret-key
```

Get these from: **Clerk Dashboard → API Keys**

### 3. Update Frontend

Add Clerk to your HTML (see `public/index.html`):

```html
<!-- Clerk Frontend SDK -->
<script async crossorigin="anonymous" src="https://[your-clerk-subdomain].clerk.accounts.dev/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"></script>

<script>
  const clerk = await window.Clerk.load({
    publishableKey: 'pk_test_your-publishable-key'
  });

  // Sign in UI
  await clerk.openSignIn();

  // Get token for API calls
  const token = await clerk.session.getToken();

  // Make authenticated request
  fetch('/api/portfolio', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
</script>
```

### 4. Start the Server

```bash
npm run server
```

Server starts on `http://localhost:3000` with Clerk middleware enabled.

## API Endpoints

### Protected Endpoints (Require Auth)

All endpoints require a valid Clerk JWT token in the `Authorization` header:

```
Authorization: Bearer <clerk-jwt-token>
```

**Portfolio Management:**
- `GET /api/portfolio` - Get current portfolio state
- `GET /api/positions` - Get all active positions
- `GET /api/trades` - Get trade history

**Analysis & Trading:**
- `GET /api/scores` - Get watchlist scores
- `POST /api/analyze` - Run analysis on watchlist
- `POST /api/execute` - Execute rotation decisions

**User Management:**
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/watchlists` - Get user watchlists
- `POST /api/user/watchlists` - Save/update watchlist

**Example API Call:**

```javascript
const token = await clerk.session.getToken();

const response = await fetch('http://localhost:3000/api/portfolio', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const portfolio = await response.json();
console.log('Portfolio value:', portfolio.totalValue);
```

## User Flow

### First-Time User

1. User signs up via Clerk
2. System creates entry in `trader.users` table
3. Default portfolio initialized with `$10,000` capital
4. Default watchlist created with top tech stocks

### Returning User

1. User signs in via Clerk
2. System loads user's portfolio state from database
3. User sees their positions, trades, and performance
4. All actions are scoped to their account

## Family Usage Example

**Dad's Portfolio:**
- User ID: `user_abc123`
- Capital: $50,000
- Watchlist: Tech stocks (AAPL, MSFT, GOOGL)
- 5 active positions

**Mom's Portfolio:**
- User ID: `user_def456`
- Capital: $25,000
- Watchlist: Healthcare stocks (JNJ, UNH, PFE)
- 3 active positions

**Kid's Portfolio:**
- User ID: `user_ghi789`
- Capital: $5,000
- Watchlist: Gaming stocks (RBLX, EA, TTWO)
- 2 active positions

Each portfolio is completely isolated and operates independently.

## Security Features

### Authentication
- ✅ JWT-based authentication via Clerk
- ✅ Secure session management
- ✅ MFA support (optional in Clerk)

### Authorization
- ✅ All API endpoints require valid user token
- ✅ User can only access their own data
- ✅ Database queries filtered by `user_id`

### Data Isolation
- ✅ Strict row-level filtering on all queries
- ✅ No cross-user data leakage
- ✅ User-specific agent instances in memory

## Configuration Options

### User Profile Settings

Users can customize:

```javascript
PUT /api/user/profile
{
  "initial_capital": 10000,
  "settings": {
    "risk_tolerance": "moderate",
    "notification_email": true,
    "auto_rebalance": false
  }
}
```

### Custom Watchlists

```javascript
POST /api/user/watchlists
{
  "name": "Tech Leaders",
  "tickers": ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"]
}
```

## Deployment

### Production Checklist

- [ ] Set up Clerk production keys
- [ ] Configure production database (Neon)
- [ ] Enable Clerk rate limiting
- [ ] Set up user webhooks (optional)
- [ ] Configure email templates in Clerk
- [ ] Add custom domain for auth
- [ ] Enable session recording (optional)

### Environment Variables (Production)

```bash
# Production Clerk Keys
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Production Database
DATABASE_URL=postgresql://...

# Azure OpenAI (Production)
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://...
```

## Monitoring & Analytics

### User Metrics

Track via Clerk Dashboard:
- Total users
- Active users (last 7/30 days)
- Sign-up conversion rate
- Authentication methods used

### Portfolio Metrics

Query database:
```sql
-- Total users with active portfolios
SELECT COUNT(DISTINCT user_id) FROM trader.portfolios;

-- Total capital under management
SELECT SUM(cash + total_value) FROM trader.portfolios;

-- Most active traders (by trade count)
SELECT user_id, COUNT(*) as trade_count
FROM trader.trades
GROUP BY user_id
ORDER BY trade_count DESC
LIMIT 10;
```

## Troubleshooting

### "Unauthorized" Error

**Problem:** API returns 401 Unauthorized

**Solutions:**
1. Check Clerk token is valid: `await clerk.session.getToken()`
2. Verify `CLERK_SECRET_KEY` in `.env`
3. Ensure `requireAuth` middleware is applied
4. Check token is in Authorization header

### User Agent Not Found

**Problem:** User's portfolio data missing

**Solutions:**
1. Check user profile exists: `GET /api/user/profile`
2. Initialize user: `PUT /api/user/profile`
3. Verify `user_id` in database matches Clerk ID

### Cross-User Data Leakage

**Problem:** Seeing another user's data

**Solutions:**
1. Verify all queries filter by `user_id`
2. Check Clerk middleware is validating tokens
3. Clear agent cache: `userService.clearAllAgents()`

## Next Steps

1. **Frontend Integration**: Build React/Vue app with Clerk components
2. **Real-time Updates**: Add WebSocket support for live portfolio updates
3. **User Invitations**: Let users invite family members
4. **Organization Support**: Group family members into organizations
5. **Audit Logs**: Track all user actions for compliance

## Support

- **Clerk Docs**: https://clerk.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Issues**: File issues in this repo

---

**Ready to onboard your family!** 🎉

Each person gets their own secure, isolated portfolio to learn trading and build wealth together.
