#!/bin/bash

# Start FastAPI backend server
# Usage: ./start-backend.sh [port]
# Default port: 8000

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

PORT="${1:-8000}"

cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Run ./scripts/setup.sh first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

echo "Starting FastAPI backend on port $PORT..."
echo "API docs available at: http://localhost:$PORT/docs"
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"
