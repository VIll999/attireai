#!/bin/bash

# Start Next.js frontend server
# Usage: ./start-frontend.sh [--local | --production]
# --local: Connect to local backend (default)
# --production: Connect to deployed backend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Run ./scripts/setup.sh first."
    exit 1
fi

MODE="${1:---local}"

case "$MODE" in
    --local)
        echo "Starting frontend with LOCAL backend (http://localhost:8001)..."
        BACKEND_URL="http://localhost:8001" NEXT_PUBLIC_BACKEND_URL="http://localhost:8001" npm run dev
        ;;
    --production)
        echo "Starting frontend with PRODUCTION backend..."
        # Uses BACKEND_URL from .env.local or Vercel environment
        npm run dev
        ;;
    *)
        echo "Usage: ./start-frontend.sh [--local | --production]"
        exit 1
        ;;
esac