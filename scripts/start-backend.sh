#!/bin/bash

# Start FastAPI backend server
# Usage: ./start-backend.sh [port]
# Default port: 8001

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

PORT="${1:-8001}"

cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Run ./scripts/setup.sh first."
    exit 1
fi

# Activate virtual environment (Windows Git Bash / Linux/macOS compatible)
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "ERROR: Cannot find venv activation script."
    echo "Tried: venv/Scripts/activate and venv/bin/activate"
    echo "Please delete backend/venv and rerun ./scripts/setup.sh"
    exit 1
fi

echo "Starting FastAPI backend on port $PORT..."
echo "API docs available at: http://localhost:$PORT/docs"
echo "Press Ctrl+C to stop"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port "$PORT"