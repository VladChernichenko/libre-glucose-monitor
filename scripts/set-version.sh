#!/bin/bash

# Script to set version information for the build
# This should be run before building the application

# Get git commit hash
GIT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
GIT_SHORT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Get build number (from CI or timestamp)
if [ -z "$BUILD_NUMBER" ]; then
    BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
fi

# Get build time
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Get branch name
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Create .env.local file with version information
cat > .env.local << EOF
# Auto-generated version information
REACT_APP_GIT_COMMIT=$GIT_COMMIT
REACT_APP_GIT_SHORT_COMMIT=$GIT_SHORT_COMMIT
REACT_APP_BUILD_NUMBER=$BUILD_NUMBER
REACT_APP_BUILD_TIME=$BUILD_TIME
REACT_APP_GIT_BRANCH=$GIT_BRANCH
EOF

echo "✅ Version information set:"
echo "   Git Commit: $GIT_SHORT_COMMIT"
echo "   Build Number: $BUILD_NUMBER"
echo "   Build Time: $BUILD_TIME"
echo "   Branch: $GIT_BRANCH"
echo ""
echo "📝 Created .env.local with version variables"
