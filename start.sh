#!/bin/bash

# Start backend and frontend for local development

echo "Starting backend server..."
npm run server &
BACKEND_PID=$!

echo "Starting frontend dev server..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
