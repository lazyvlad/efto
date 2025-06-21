#!/bin/bash

# EFTO Game - Cache Busting Deployment Script
# This script automatically updates version numbers and implements cache busting

echo "🚀 EFTO Game - Cache Busting Deployment"
echo "========================================"

# Get current version from config
CURRENT_VERSION=$(grep 'GAME_VERSION = ' config/gameConfig.js | cut -d'"' -f2)
echo "Current version: $CURRENT_VERSION"

# Prompt for new version
read -p "Enter new version (or press Enter to auto-increment): " NEW_VERSION

# Auto-increment if no version provided
if [ -z "$NEW_VERSION" ]; then
    # Extract version parts
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR=${VERSION_PARTS[0]}
    MINOR=${VERSION_PARTS[1]}
    PATCH=${VERSION_PARTS[2]}
    
    # Increment patch version
    PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$PATCH"
fi

echo "New version: $NEW_VERSION"

# Update version in gameConfig.js
sed -i.bak "s/GAME_VERSION = \"$CURRENT_VERSION\"/GAME_VERSION = \"$NEW_VERSION\"/" config/gameConfig.js
echo "✅ Updated version in gameConfig.js"

# Update build timestamp
TIMESTAMP=$(date +%s000)  # JavaScript timestamp (milliseconds)
sed -i.bak "s/BUILD_TIMESTAMP = [0-9]*/BUILD_TIMESTAMP = $TIMESTAMP/" config/gameConfig.js
echo "✅ Updated build timestamp"

# Create versioned copies of critical files (optional)
if [ "$1" == "--versioned-files" ]; then
    echo "📦 Creating versioned file copies..."
    cp game-modular.js "game-modular-v$NEW_VERSION.js"
    cp config/gameConfig.js "config/gameConfig-v$NEW_VERSION.js"
    echo "✅ Created versioned file copies"
fi

# Generate cache-busting manifest
echo "📋 Generating cache manifest..."
cat > cache-manifest.json << EOF
{
    "version": "$NEW_VERSION",
    "timestamp": $TIMESTAMP,
    "files": {
        "game-modular.js": "v=$NEW_VERSION",
        "config/gameConfig.js": "v=$NEW_VERSION",
        "data/gameItems.js": "v=$NEW_VERSION",
        "data/playerSpells.js": "v=$NEW_VERSION",
        "systems/spellSystem.js": "v=$NEW_VERSION",
        "utils/gameUtils.js": "v=$NEW_VERSION",
        "index.html": "v=$NEW_VERSION"
    },
    "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
echo "✅ Generated cache manifest"

# Add .htaccess for Apache servers (cache control)
if [ ! -f .htaccess ]; then
    echo "🔧 Creating .htaccess for cache control..."
    cat > .htaccess << 'EOF'
# EFTO Game - Cache Control for Mobile Browsers
<IfModule mod_headers.c>
    # Force no-cache for HTML files
    <FilesMatch "\.(html|htm)$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires 0
    </FilesMatch>
    
    # Short cache for JS/CSS with version parameters
    <FilesMatch "\.(js|css)$">
        Header set Cache-Control "public, max-age=300, must-revalidate"
    </FilesMatch>
    
    # Longer cache for images
    <FilesMatch "\.(png|jpg|jpeg|gif|webp)$">
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>
    
    # Force revalidation for JSON files
    <FilesMatch "\.json$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
EOF
    echo "✅ Created .htaccess"
fi

# Create deployment checklist
echo "📝 Creating deployment checklist..."
cat > deployment-checklist.md << EOF
# EFTO Game Deployment Checklist - v$NEW_VERSION

## Pre-Deployment
- [ ] All changes tested locally
- [ ] Version updated to $NEW_VERSION
- [ ] Build timestamp updated to $TIMESTAMP
- [ ] Mobile browser testing completed

## Cache Busting
- [ ] Version number incremented in gameConfig.js
- [ ] Cache manifest generated
- [ ] .htaccess file configured for cache control

## Mobile Browser Testing
Test the following after deployment:
- [ ] iPhone Safari (force refresh)
- [ ] Chrome Mobile (force refresh)
- [ ] Samsung Internet
- [ ] Firefox Mobile

## Post-Deployment
- [ ] Clear CDN cache (if using)
- [ ] Test on mobile devices
- [ ] Verify cache-busting is working
- [ ] Monitor for any loading issues

## Force Refresh Instructions for Users
If users report old version:
1. Mobile Safari: Settings > Safari > Clear History and Website Data
2. Chrome Mobile: Settings > Privacy > Clear browsing data
3. Manual: Add ?v=$NEW_VERSION to URL

EOF

echo "✅ Deployment checklist created"

# Display summary
echo ""
echo "🎉 DEPLOYMENT READY!"
echo "==================="
echo "Version: $CURRENT_VERSION → $NEW_VERSION"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "📱 Mobile Cache Busting Features:"
echo "  ✅ Version-based URL parameters"
echo "  ✅ Cache control headers"
echo "  ✅ Automatic update detection"
echo "  ✅ Mobile refresh prompts"
echo ""
echo "📋 Next Steps:"
echo "  1. Review deployment-checklist.md"
echo "  2. Upload files to server"
echo "  3. Test on mobile devices"
echo "  4. Clear CDN cache if applicable"
echo ""

# Clean up backup files
rm -f config/gameConfig.js.bak

echo "🚀 Ready for deployment!" 