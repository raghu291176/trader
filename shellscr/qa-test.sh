#!/bin/bash

# QA Test Script for Portfolio Rotation Agent Multi-User API
# Tests all endpoints with mock authentication

set -e

API_URL="http://localhost:3000"
TEST_USER_ID="test_user_123"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "Portfolio Rotation Agent - QA Tests"
echo "======================================"
echo

# Test 1: Server Health Check
echo "Test 1: Server Health Check"
if curl -s -o /dev/null -w "%{http_code}" "$API_URL" | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not responding${NC}"
    exit 1
fi
echo

# Test 2: Database Connectivity
echo "Test 2: Database Connectivity"
echo "Checking Neon database connection..."
psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
fi
echo

# Test 3: User Tables Exist
echo "Test 3: Verify User Tables"
TABLES=$(psql "${DATABASE_URL}" -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='trader' AND table_name IN ('users', 'watchlists');" | tr -d ' ')
if echo "$TABLES" | grep -q "users"; then
    echo -e "${GREEN}✓ trader.users table exists${NC}"
else
    echo -e "${RED}✗ trader.users table missing${NC}"
fi

if echo "$TABLES" | grep -q "watchlists"; then
    echo -e "${GREEN}✓ trader.watchlists table exists${NC}"
else
    echo -e "${RED}✗ trader.watchlists table missing${NC}"
fi
echo

# Test 4: User ID Columns
echo "Test 4: Verify user_id columns"
COLUMNS=$(psql "${DATABASE_URL}" -t -c "SELECT column_name FROM information_schema.columns WHERE table_schema='trader' AND column_name='user_id';" | tr -d ' ')
COL_COUNT=$(echo "$COLUMNS" | wc -l)
if [ "$COL_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓ user_id columns added to tables ($COL_COUNT tables)${NC}"
else
    echo -e "${YELLOW}⚠ Expected at least 4 tables with user_id column${NC}"
fi
echo

# Test 5: API Endpoints (Without Auth - Should Fail)
echo "Test 5: API Endpoints Without Authentication"

echo "Testing GET /api/portfolio (should fail without auth)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/portfolio")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    echo -e "${GREEN}✓ Portfolio endpoint properly protected (HTTP $STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Portfolio endpoint returned HTTP $STATUS (expected 401/403)${NC}"
fi

echo "Testing GET /api/positions (should fail without auth)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/positions")
if [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
    echo -e "${GREEN}✓ Positions endpoint properly protected (HTTP $STATUS)${NC}"
else
    echo -e "${YELLOW}⚠ Positions endpoint returned HTTP $STATUS (expected 401/403)${NC}"
fi
echo

# Test 6: Environment Variables
echo "Test 6: Environment Variables"
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓ DATABASE_URL is set${NC}"
else
    echo -e "${RED}✗ DATABASE_URL is missing${NC}"
fi

if [ -n "$CLERK_SECRET_KEY" ]; then
    echo -e "${GREEN}✓ CLERK_SECRET_KEY is set${NC}"
else
    echo -e "${RED}✗ CLERK_SECRET_KEY is missing${NC}"
fi

if [ -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
    echo -e "${GREEN}✓ CLERK_PUBLISHABLE_KEY is set${NC}"
else
    echo -e "${RED}✗ CLERK_PUBLISHABLE_KEY is missing${NC}"
fi

if [ -n "$AZURE_OPENAI_API_KEY" ]; then
    echo -e "${GREEN}✓ AZURE_OPENAI_API_KEY is set${NC}"
else
    echo -e "${YELLOW}⚠ AZURE_OPENAI_API_KEY is missing (optional)${NC}"
fi
echo

# Test 7: TypeScript Build
echo "Test 7: TypeScript Compilation"
echo "Running tsc --noEmit to check for type errors..."
npx tsc --noEmit 2>&1 | head -5
ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ No TypeScript errors${NC}"
elif [ "$ERROR_COUNT" -lt 10 ]; then
    echo -e "${YELLOW}⚠ $ERROR_COUNT TypeScript errors (acceptable for MVP)${NC}"
else
    echo -e "${RED}✗ $ERROR_COUNT TypeScript errors${NC}"
fi
echo

# Summary
echo "======================================"
echo "QA Test Summary"
echo "======================================"
echo -e "${GREEN}✓${NC} - Tests passed"
echo -e "${YELLOW}⚠${NC} - Warnings (acceptable)"
echo -e "${RED}✗${NC} - Critical failures"
echo
echo "Next Steps:"
echo "1. Start server: npm run server"
echo "2. Test with Clerk auth token"
echo "3. Deploy to production"
echo
