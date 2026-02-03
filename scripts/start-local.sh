#!/bin/bash

# Start both backend and frontend for local development
# Usage: ./start-local.sh [backend_port]
# Default backend port: 8000, frontend always runs on 3000

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

BACKEND_PORT="${1:-8000}"

echo "============================================"
echo "  AttireAI Local Development Environment"
echo "============================================"
echo ""
echo "Backend:  http://localhost:$BACKEND_PORT"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "============================================"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
"$SCRIPT_DIR/start-backend.sh" "$BACKEND_PORT" &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend in background
cd "$PROJECT_ROOT"
BACKEND_URL="http://localhost:$BACKEND_PORT" npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
