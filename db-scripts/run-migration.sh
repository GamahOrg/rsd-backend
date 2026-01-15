#!/bin/bash

# Data Migration Script Runner
# This script runs the TypeScript migration to copy 500 users to the test database

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the project root (parent of db-scripts)
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Change to project root
cd "$PROJECT_ROOT"

echo "=========================================="
echo "  RSD Data Migration to Test Database"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Please create a .env file with your source database credentials:"
    echo ""
    echo "DB_HOST=your-source-host"
    echo "DB_PORT=1433"
    echo "DB_USERNAME=your-username"
    echo "DB_PASSWORD=your-password"
    echo "DB_NAME=X_DATA"
    echo ""
    exit 1
fi

echo "✅ Found .env file"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting migration..."
echo ""
echo "Target Database:"
echo "  Server: rega-dev-db.database.windows.net"
echo "  Database: X_DATA"
echo ""
echo "This will migrate:"
echo "  - All countries"
echo "  - Top 500 users (by post count)"
echo "  - All posts for those users"
echo "  - All mentions for those posts"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Run the migration
npm run migrate:test-db

echo ""
echo "=========================================="
echo "  Migration Complete!"
echo "=========================================="

