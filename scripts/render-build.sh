#!/bin/bash

# Render build script - automatically sets version information during deployment

echo "🚀 Starting Render build with version information..."

# Set version information
./scripts/set-version.sh

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build the application
echo "🔨 Building application..."
npm run build

echo "✅ Render build completed successfully!"
