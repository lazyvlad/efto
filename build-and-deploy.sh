#!/bin/bash

# EFTO Game - Build and Deploy Script
# This script builds the production version and optionally deploys it

set -e  # Exit on any error

echo "🚀 EFTO Game - Build and Deploy Script"
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing build dependencies..."
    npm install
    echo "✅ Dependencies installed successfully"
fi

# Build production version
echo "🏗️  Building production version..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Production files are in the 'dist/' directory"
else
    echo "❌ Build failed!"
    exit 1
fi

# Ask user if they want to deploy
read -p "🚀 Do you want to deploy to server? (y/N): " deploy_choice

if [[ $deploy_choice =~ ^[Yy]$ ]]; then
    echo "🌐 Starting deployment..."
    
    # Check if deploy script exists
    if [ -f "deploy-cache-bust.sh" ]; then
        # Copy dist files to project root for deployment
        echo "📋 Preparing files for deployment..."
        cp -r dist/* .
        
        # Run the existing deploy script
        chmod +x deploy-cache-bust.sh
        ./deploy-cache-bust.sh
        
        echo "✅ Deployment completed!"
    else
        echo "❌ Deploy script not found. Please run deploy manually."
    fi
else
    echo "ℹ️  Skipping deployment. Production files are ready in 'dist/' directory."
fi

echo ""
echo "🎉 Process completed!"
echo "💡 Tips:"
echo "   - Use 'npm run build' for production builds"
echo "   - Use 'npm run build:dev' for development builds"
echo "   - Use 'npm run clean' to clean the dist directory" 