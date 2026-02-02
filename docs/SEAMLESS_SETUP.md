# Seamless Full-Stack TypeScript Setup

## Architecture

```
├── src/                    # Backend (Express + TypeScript)
│   ├── server/api.ts      # REST API with Clerk auth
│   ├── services/          # Business logic
│   └── agent/             # Trading agent
│
├── frontend/              # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API client
│   │   └── types/         # Shared TypeScript types
│   └── vite.config.ts     # Vite with API proxy
│
└── Database: Neon PostgreSQL with multi-user support
```

## Quick Start

### 1. Start Backend API
```bash
# Terminal 1: Backend
npm run server

# Server starts on http://localhost:3000
```

### 2. Start Frontend
```bash
# Terminal 2: Frontend
cd frontend
npm run dev

# Frontend starts on http://localhost:5173
# API calls proxy to backend automatically
```

### 3. Open Browser
```
http://localhost:5173
```

## Features

### Seamless Integration

✅ **Type-Safe API Client**
- TypeScript interfaces shared between frontend/backend
- Auto-completion for API responses
- Compile-time type checking

✅ **Automatic Authentication**
- Clerk JWT tokens automatically attached to requests
- Token refresh handled transparently
- Secure session management

✅ **API Proxy**
- Vite proxies `/api/*` to backend
- No CORS issues
- Single domain in development

✅ **Hot Module Replacement**
- Frontend: Instant UI updates
- Backend: Restart on changes
- Seamless development experience

## User Flow

### 1. Landing Page
- User sees welcome screen
- "Sign In" button (Clerk modal)

### 2. Authentication
- Clerk handles sign-in (email, Google, etc.)
- JWT token generated
- API service configured with token

### 3. Dashboard
- Loads user's portfolio data
- Real-time positions & trades
- Top stock scores
- Execute rotation button

### 4. Multi-User Isolation
- Each user has separate portfolio
- Data isolated by `user_id`
- No cross-user data leakage

## API Integration

### Frontend → Backend

```typescript
// Frontend: src/services/api.ts
const portfolio = await apiService.getPortfolio()
// → GET /api/portfolio
// → Headers: { Authorization: "Bearer <clerk-jwt>" }
// → Response: { totalValue, cash, unrealizedPnL, ... }

// Backend: src/server/api.ts
app.get('/api/portfolio', requireAuth, async (req, res) => {
  const userId = getUserId(req)  // Extract from JWT
  const agent = await userService.getUserAgent(userId)
  const output = agent.getAgentOutput()
  res.json(output.performance)
})
```

### Type Safety

```typescript
// Shared types: frontend/src/types/index.ts
export interface Portfolio {
  totalValue: number
  cash: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  maxDrawdown: number
  positionCount: number
}

// API service knows the type
async getPortfolio(): Promise<Portfolio> {
  const { data } = await this.client.get<Portfolio>('/portfolio')
  return data  // TypeScript validates this!
}

// Component uses typed data
const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
const data = await apiService.getPortfolio()
setPortfolio(data)  // Type-safe!
```

## Development Workflow

### Terminal Setup

```bash
# Terminal 1: Backend
npm run server
# Watches: src/**/*.ts
# Restarts on changes

# Terminal 2: Frontend
cd frontend && npm run dev
# HMR enabled
# Updates instantly

# Terminal 3: Database (optional)
npm run db:migrate
```

### Making Changes

**Add New API Endpoint:**

1. **Backend** (`src/server/api.ts`):
```typescript
app.get('/api/new-endpoint', requireAuth, async (req, res) => {
  const userId = getUserId(req)
  // ... logic
  res.json(data)
})
```

2. **Frontend Types** (`frontend/src/types/index.ts`):
```typescript
export interface NewData {
  field1: string
  field2: number
}
```

3. **API Service** (`frontend/src/services/api.ts`):
```typescript
async getNewData(): Promise<NewData> {
  const { data } = await this.client.get<NewData>('/new-endpoint')
  return data
}
```

4. **Component** (`frontend/src/components/Dashboard.tsx`):
```typescript
const newData = await apiService.getNewData()
```

Done! Full type safety from DB → Backend → Frontend → UI.

## Testing

### Backend Tests
```bash
npm test
```

### Frontend Tests
```bash
cd frontend && npm test
```

### Integration Testing
```bash
# Start both servers
npm run server &
cd frontend && npm run dev &

# Run Playwright tests (TODO)
npm run test:e2e
```

## Building for Production

### Backend
```bash
npm run build
# Output: dist/

npm start
# Runs compiled JS
```

### Frontend
```bash
cd frontend && npm run build
# Output: dist/

npm run preview
# Preview production build
```

### Deploy
```bash
# Backend: Deploy to Railway/Render/Fly.io
# Frontend: Deploy to Vercel/Netlify
# Database: Already on Neon

# Set environment variables:
# - Backend: CLERK_SECRET_KEY, DATABASE_URL
# - Frontend: VITE_CLERK_PUBLISHABLE_KEY
```

## Environment Variables

### Backend (`.env`)
```bash
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=...
FINNHUB_API_KEY=...
```

### Frontend (`frontend/.env`)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Troubleshooting

### Backend Won't Start
```bash
# Check TypeScript errors
npm run build

# Check port 3000 is free
lsof -i :3000
```

### Frontend Won't Connect
```bash
# Verify backend is running
curl http://localhost:3000/api/portfolio

# Check Vite proxy config
cat frontend/vite.config.ts
```

### Auth Not Working
```bash
# Verify Clerk keys match
grep CLERK .env
grep VITE_CLERK frontend/.env

# Check JWT token
# Open browser DevTools → Network → Headers
```

## Tech Stack

**Backend:**
- Express.js
- TypeScript
- Clerk Express SDK
- Neon PostgreSQL

**Frontend:**
- React 18
- TypeScript
- Vite
- Clerk React SDK
- Axios

**Database:**
- Neon PostgreSQL
- pgvector extension
- Multi-user tables

**Authentication:**
- Clerk (email, OAuth)
- JWT tokens
- Secure sessions

---

**You now have a production-ready, type-safe, multi-user trading platform!** 🚀

Each family member signs in with Clerk, gets their own isolated portfolio, and trades independently. Everything is TypeScript from database to UI.
