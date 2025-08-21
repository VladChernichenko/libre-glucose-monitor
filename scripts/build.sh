#!/bin/bash

# Libre Glucose Monitor - Production Build Script

echo "🏗️  Building Libre Glucose Monitor for production..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Using default API endpoint."
    echo "   Create a .env file with REACT_APP_LIBRE_API_URL for production."
fi

# Clean previous build
if [ -d "build" ]; then
    echo "🧹 Cleaning previous build..."
    rm -rf build
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📁 Build output: ./build/"
    echo "📊 Build size:"
    du -sh build/
    echo ""
    echo "🚀 To serve the production build:"
    echo "   npx serve -s build"
    echo "   or"
    echo "   python3 -m http.server --directory build"
    echo ""
    echo "🌐 The app will be available at the URL shown above"
else
    echo "❌ Build failed"
    exit 1
fi
