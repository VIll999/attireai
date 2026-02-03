#!/bin/bash

# Run linters for both frontend and backend
# Usage: ./lint.sh [frontend | backend | all]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

TARGET="${1:-all}"

lint_frontend() {
    echo "Linting frontend..."
    cd "$PROJECT_ROOT"
    npm run lint
}

lint_backend() {
    echo "Linting backend..."
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate

    # Check if ruff is installed, if not use default
    if command -v ruff &> /dev/null; then
        ruff check app/
    else
        echo "Tip: Install ruff for faster Python linting: pip install ruff"
        python -m py_compile app/main.py app/config.py
        echo "Backend syntax OK"
    fi
}

case "$TARGET" in
    frontend)
        lint_frontend
        ;;
    backend)
        lint_backend
        ;;
    all)
        lint_frontend
        echo ""
        lint_backend
        ;;
    *)
        echo "Usage: ./lint.sh [frontend | backend | all]"
        exit 1
        ;;
esac

echo ""
echo "Linting complete!"
