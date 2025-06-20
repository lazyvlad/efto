#!/bin/bash

# EFTO Game Deployment Configuration Script
# This script helps you set up the server configuration for different deployment scenarios

echo "🎮 EFTO Game - Deployment Configuration Setup"
echo "=============================================="
echo ""

# Check if serverConfig.js already exists
if [ -f "config/serverConfig.js" ]; then
    echo "⚠️  config/serverConfig.js already exists!"
    read -p "Do you want to overwrite it? (y/N): " overwrite
    if [[ ! $overwrite =~ ^[Yy]$ ]]; then
        echo "Aborted. You can manually edit config/serverConfig.js"
        exit 0
    fi
fi

# Copy the example file
if [ ! -f "config/serverConfig.example.js" ]; then
    echo "❌ Error: config/serverConfig.example.js not found!"
    echo "Make sure you're running this script from the game root directory."
    exit 1
fi

cp config/serverConfig.example.js config/serverConfig.js
echo "✅ Created config/serverConfig.js from example"

# Interactive configuration
echo ""
echo "📝 Let's configure your deployment settings:"
echo ""

# Get base path
echo "1. What's your deployment path?"
echo "   Examples:"
echo "   - Root directory (https://yourdomain.com/): Enter nothing (just press Enter)"
echo "   - Subdirectory (https://yourdomain.com/game/): Enter '/game'"
echo "   - Nested path (https://yourdomain.com/projects/efto/): Enter '/projects/efto'"
echo "   - GitHub Pages: Enter '/your-repository-name'"
echo ""
read -p "Base path (or press Enter for root): " base_path

# Get server type
echo ""
echo "2. What type of server are you using?"
echo "   1) PHP server (default)"
echo "   2) Python/Flask server"
echo "   3) Custom endpoint"
echo ""
read -p "Choose (1-3, default 1): " server_type

# Set endpoint based on server type
case $server_type in
    2)
        endpoint="api/highscores"
        ;;
    3)
        read -p "Enter your custom endpoint: " endpoint
        ;;
    *)
        endpoint="api/highscores.php"
        ;;
esac

# Development mode
echo ""
read -p "3. Enable development mode for extra logging? (y/N): " dev_mode
if [[ $dev_mode =~ ^[Yy]$ ]]; then
    is_dev="true"
else
    is_dev="false"
fi

# Apply configuration
echo ""
echo "🔧 Applying configuration..."

# Use sed to replace values in the config file
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS sed
    sed -i '' "s|basePath: '',|basePath: '$base_path',|g" config/serverConfig.js
    sed -i '' "s|highscores: 'api/highscores.php',|highscores: '$endpoint',|g" config/serverConfig.js
    sed -i '' "s|isDevelopment: false,|isDevelopment: $is_dev,|g" config/serverConfig.js
else
    # Linux sed
    sed -i "s|basePath: '',|basePath: '$base_path',|g" config/serverConfig.js
    sed -i "s|highscores: 'api/highscores.php',|highscores: '$endpoint',|g" config/serverConfig.js
    sed -i "s|isDevelopment: false,|isDevelopment: $is_dev,|g" config/serverConfig.js
fi

echo "✅ Configuration applied!"
echo ""
echo "📋 Summary:"
echo "  - Base Path: '$base_path'"
echo "  - API Endpoint: $endpoint"
echo "  - Development Mode: $is_dev"
echo ""
echo "🚀 Your config/serverConfig.js is ready!"
echo "   Upload it to your server alongside the game files."
echo ""
echo "📖 For more information, see README_API_CONFIG.md" 