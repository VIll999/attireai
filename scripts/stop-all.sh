#!/bin/bash

# Stop all running development servers
# Usage: ./stop-all.sh

echo "Stopping AttireAI development servers..."

# Kill uvicorn processes (backend)
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "Stopped backend server" || echo "No backend server running"

# Kill next dev processes (frontend)
pkill -f "next dev" 2>/dev/null && echo "Stopped frontend server" || echo "No frontend server running"

# Kill any node processes on port 3000
lsof -ti:3000 | xargs kill 2>/dev/null || true

# Kill any python processes on port 8000
lsof -ti:8000 | xargs kill 2>/dev/null || true

echo "Done."
