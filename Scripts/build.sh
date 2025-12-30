#!/bin/bash
# Build script for Ark Alliance Trading Providers Library
# This script builds the TypeScript library for distribution

set -e

echo "==================================="
echo "Building Ark Alliance Trading Providers Library"
echo "==================================="

# Navigate to library directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LIB_PATH="$SCRIPT_DIR/../src/Ark.Alliance.Trading.Providers.Lib"
cd "$LIB_PATH"

# Clean previous build
echo ""
echo "[1/3] Cleaning previous build..."
if [ -d "dist" ]; then
    rm -rf dist
    echo "✓ Cleaned dist directory"
fi

# Install dependencies
echo ""
echo "[2/3] Installing dependencies..."
npm ci
echo "✓ Dependencies installed"

# Build TypeScript
echo ""
echo "[3/3] Compiling TypeScript..."
npm run build
echo "✓ Build successful"

# Show build summary
echo ""
echo "==================================="
echo "Build Summary"
echo "==================================="
echo "Output Directory: $LIB_PATH/dist"
echo "Package Name: ark-alliance-trading-providers-lib"
echo "Status: ✓ Ready for publishing"
echo "==================================="
