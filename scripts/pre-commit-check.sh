#!/bin/bash

# Pre-commit check script for libre-glucose-monitor
# This script ensures the project compiles successfully before allowing commits
# 
# USAGE: Only run this when you've made code changes that could affect compilation
#        Skip this for documentation updates, git operations, or when no code changed

echo "🔍 Running pre-commit checks..."
echo "💡 Remember: Only run this when you've made code changes!"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Error: node_modules not found. Please run 'npm install' first."
    exit 1
fi

echo "📦 Checking TypeScript compilation..."

# Run TypeScript compilation check
if npm run build > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed!"
    echo "Please fix compilation errors before committing."
    echo "Run 'npm run build' to see detailed errors."
    exit 1
fi

echo "🧪 Checking for ESLint warnings..."

# Run ESLint check
if npm run lint > /dev/null 2>&1; then
    echo "✅ ESLint check passed"
else
    echo "⚠️  ESLint warnings found (not blocking commit)"
    echo "Run 'npm run lint' to see details."
fi

echo ""
echo "🚀 All pre-commit checks passed! Ready to commit."
echo "💡 Tip: You can now safely commit your code changes."
exit 0
