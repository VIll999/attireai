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
    python -m venv venv
fi

echo ""
echo "[3/4] Installing backend dependencies..."

# Activate venv (Windows Git Bash / Linux/macOS compatible)
if [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# show which python/pip are being used (helps avoid wrong-environment installs)
echo "Using Python: $(python -c "import sys; print(sys.executable)")"
echo "Using Pip:    $(python -m pip -V)"
# remove -q so install errors are visible
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
# dependency sanity check (fail fast)
python -c "import fastapi, uvicorn; import openai; print('Backend deps OK')"

# Create .env files if they don't exist
echo ""
echo "[4/4] Setting up environment files..."

if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    echo "BACKEND_URL=http://localhost:8001" > "$PROJECT_ROOT/.env.local"
    echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8001" >> "$PROJECT_ROOT/.env.local"
    echo "Created .env.local for frontend"
fi

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    cp "$PROJECT_ROOT/backend/.env.example" "$PROJECT_ROOT/backend/.env"
    echo "Created backend/.env from .env.example"

    {
        echo ""
        echo "# OpenAI"
        echo "OPENAI_API_KEY="
        echo "OPENAI_MODEL=gpt-4.1-mini"
    } >> "$PROJECT_ROOT/backend/.env"

    echo "Appended OpenAI config to backend/.env"
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit backend/.env with your database credentials"
echo "  2. Add OPENAI_API_KEY to backend/.env"
echo "  3. Run ./scripts/start-local.sh to start development"
echo ""