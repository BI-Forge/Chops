#!/bin/bash
# Script to clean WSL artifacts from the project directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Remove WSL-related directories and files
echo "Cleaning WSL artifacts..."

# Remove directories with WSL patterns
find . -maxdepth 1 -type d \( -name "*wsl.localhost*" -o -name "__wsl*" -o -name "\\wsl*" \) -exec rm -rf {} + 2>/dev/null || true

# Remove nested WSL directories
find . -type d -path "*/\\wsl.localhost*" -exec rm -rf {} + 2>/dev/null || true
find . -type d -path "*/__wsl*" -exec rm -rf {} + 2>/dev/null || true

echo "WSL artifacts cleaned."

