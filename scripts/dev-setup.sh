#!/bin/bash

# Libre Glucose Monitor - Development Setup Script

echo "🚀 Setting up Libre Glucose Monitor development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cat > .env << EOF
# Libre LinkUp API Configuration
REACT_APP_LIBRE_API_URL=https://api.libreview.com

# Note: In production, ensure this is set to the correct API endpoint
# The application will use this URL for all API calls
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Check if the app is already running
if pgrep -f "react-scripts start" > /dev/null; then
    echo "🔄 Development server is already running"
    echo "🌐 Open http://localhost:3000 in your browser"
else
    echo "🚀 Starting development server..."
    echo "🌐 The app will be available at http://localhost:3000"
    echo "📱 Demo mode is enabled by default for testing"
    echo ""
    echo "Press Ctrl+C to stop the server"
    npm start
fi

echo ""
echo "🎉 Setup complete! Happy coding!"
