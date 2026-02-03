#!/bin/bash

# Initial project setup - installs all dependencies
# Usage: ./setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "============================================"
echo "  AttireAI Project Setup"
echo "============================================"
echo ""

# Frontend setup
echo "[1/4] Installing frontend dependencies..."
cd "$PROJECT_ROOT"
if command -v pnpm &> /dev/null; then
    pnpm install
elif command -v npm &> /dev/null; then
    npm install
else
    echo "Error: npm or pnpm not found"
    exit 1
fi

# Backend setup
echo ""
echo "[2/4] Setting up Python virtual environment..."
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

echo ""
echo "[3/4] Installing backend dependencies..."
source venv/bin/activate
pip install -r requirements.txt -q

# Create .env files if they don't exist
echo ""
echo "[4/4] Setting up environment files..."

if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo "BACKEND_URL=http://localhost:8000" > "$PROJECT_ROOT/.env.local"
    echo "Created .env.local for frontend"
fi

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    echo "Created backend/.env from .env.example"
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your database credentials"
echo "  2. Run ./scripts/start-local.sh to start development"
echo ""
