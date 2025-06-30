# EFTO Game - Build System Documentation

## Overview

This build system creates optimized production versions of the EFTO game with minified code, removed console logs, and optimized assets. It supports both development and production builds with automatic cache busting.

## Prerequisites

- **Node.js** (version 14 or higher)
- **npm** (usually comes with Node.js)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Production Version
```bash
npm run build
```

### 3. Build and Deploy (One Command)
```bash
# Linux/Mac
./build-and-deploy.sh

# Windows
build-and-deploy.bat
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run build` | 🏭 Production build (minified, no console logs) |
| `npm run build:dev` | 🛠️ Development build (unminified, keep console logs) |
| `npm run clean` | 🧹 Clean the dist directory |

## Build Features

### Production Build (`npm run build`)
- ✅ **JavaScript Minification**: Reduces file sizes by 60-80%
- ✅ **Console Log Removal**: All `console.log()` statements removed
- ✅ **CSS Minification**: Optimized CSS with reduced file sizes
- ✅ **Semantic Version Cache Busting**: Uses game version for browser cache invalidation
- ✅ **File Hash Cache Busting**: Additional hash-based cache busting for main files
- ✅ **Dead Code Elimination**: Removes unused code
- ✅ **Interactive Game Versioning**: Prompts for version updates and auto-updates timestamps
- ✅ **Interactive Server Config**: Automatically sets up `serverConfig.js` if missing
- ✅ **Build Info**: Generates `build-info.json` with build metadata

### Development Build (`npm run build:dev`)
- 📋 **Unminified Code**: Easy to debug
- 🔍 **Console Logs Preserved**: All debugging output kept
- ⚡ **Faster Build**: No minification processing
- 🚫 **No Cache Busting**: Uses original filenames

## Output Structure

After building, the `dist/` directory contains:

```
dist/
├── index.html              # Main game HTML (with build info)
├── test-mobile.html         # Mobile test page
├── game-modular.js          # Main game script (minified in production)
├── classes/                 # Game classes (minified in production)
├── systems/                 # Game systems (minified in production)
├── utils/                   # Utility functions (minified in production)
├── data/                    # Game data (minified in production)
├── config/                  # Configuration files (minified in production)
├── styles/                  # CSS files (minified in production)
├── assets/                  # Game assets (copied as-is)
├── items/                   # Item images (copied as-is)
├── api/                     # API files (copied as-is)
├── build-info.json          # Build metadata and file mapping
└── [other files]            # Server files, favicon, etc.
```

## File Size Comparisons

Typical size reductions for production builds:

| File Type | Original Size | Minified Size | Reduction |
|-----------|---------------|---------------|-----------|
| `game-modular.js` | ~170KB | ~60KB | ~65% |
| CSS files | ~50KB | ~20KB | ~60% |
| **Total** | ~220KB | ~80KB | ~64% |

## Interactive Server Configuration

### Automatic Setup
When you run `npm run build`, the system checks for `config/serverConfig.js`:

- ✅ **If found**: Copies existing config to dist folder
- ⚙️ **If missing**: Prompts you to create one interactively

### Configuration Options
The interactive setup will ask you to configure:

1. **Deployment Path** 
   - Root directory: `` (most common)
   - Subdirectory: `/game`
   - GitHub Pages: `/repository-name`

2. **Server Type**
   - PHP Server → `api/highscores.php`
   - Python/Flask → `api/highscores`  
   - Custom endpoint

3. **Environment Mode**
   - Development: Extra logging enabled
   - Production: Optimized for deployment

### Example Configuration Session
```
⚙️  Checking server configuration...
🔧 No serverConfig.js found!
📋 The game needs a server configuration file to work properly.
Would you like to create serverConfig.js now? [y/N]: y

📋 Server Configuration Setup
1. Deployment Path Configuration
🔗 Enter the base path (or press Enter for root): 

2. Server Type Configuration
🖥️  Select server type:
[1] PHP Server
[2] Python/Flask Server  
[3] Custom endpoint
[0] CANCEL
> 1

3. Environment Configuration
🔍 Is this a development environment? [y/N]: n

✅ Created serverConfig.js in both source and dist directories
```

## Interactive Game Versioning

### Automatic Version Management
When you run `npm run build`, the system reads the current version from `config/gameConfig.js` and prompts you to update it:

```
🏷️  Checking game version...
📋 Current game version: 1.3.0
Do you want to update the game version? (current: 1.3.0) [y/N]: y

🏷️  Game Version Update
Current version: 1.3.0

Suggested version increments:
  Patch: 1.3.1 (bug fixes)
  Minor: 1.4.0 (new features)
  Major: 2.0.0 (breaking changes)

🏷️  Enter new version: 1.3.1
✅ Updated game version to: 1.3.1
```

### Version-Based Cache Busting
The system automatically updates all resource references with the version:

**Before:**
```html
<script type="module" src="game-modular.js?v=1.3.0"></script>
<link rel="stylesheet" href="styles/base.css?v=1.3.0">
```

**After:**
```html
<script type="module" src="game-modular.abc12345.js?v=1.3.1"></script>
<link rel="stylesheet" href="styles/base.css?v=1.3.1">
```

### Automated Updates
The build system automatically:
- ✅ **Updates `GAME_VERSION`** in `config/gameConfig.js`
- ✅ **Updates `BUILD_TIMESTAMP`** with current build time
- ✅ **Version-tags all resources** (JS, CSS files)
- ✅ **Preserves semantic versioning** for proper release management

### Version Workflow
Typical deployment workflow:
1. **Pull latest code** from repository
2. **Run build**: `npm run build`
3. **Update version** when prompted (e.g., 1.3.0 → 1.3.1)
4. **Deploy** - all browsers will pull fresh resources due to version change

## Cache Busting

The build system provides **dual-layer cache busting** for maximum reliability:

### 1. Semantic Version Cache Busting
**All resources** get version parameters:
```html
<!-- All script and CSS files -->
<script src="game-modular.js?v=1.3.1"></script>
<link href="styles/base.css?v=1.3.1">
```

### 2. File Hash Cache Busting  
**Main files** get additional hash-based filenames:
```html
<!-- Main game file gets both hash and version -->
<script src="game-modular.abc12345.js?v=1.3.1"></script>
```

### Cache Busting Strategy
- **Version parameters** (`?v=1.3.1`) - Change when you update the game version
- **File hashes** (`abc12345`) - Change on every production build
- **Dual protection** ensures browsers always get the latest code

## Build Configuration

The build system can be customized by editing `build.js`:

```javascript
const CONFIG = {
    srcDir: '.',                    // Source directory
    distDir: 'dist',               // Output directory
    isDev: process.argv.includes('--dev'),
    addCacheBusting: !process.argv.includes('--no-cache'),
    
    // Files to process
    jsFiles: [
        'game-modular.js',
        'classes/**/*.js',
        'systems/**/*.js',
        'utils/**/*.js',
        'data/**/*.js',
        'config/**/*.js'
    ],
    // ... more configuration
};
```

## Advanced Usage

### Custom Build Options
```bash
# Build without cache busting
node build.js --no-cache

# Development build
node build.js --dev

# Production build (default)
node build.js
```

### Terser Options (JavaScript Minification)
The build system uses Terser with these optimizations:
- ✅ Console log removal (`drop_console: true`)
- ✅ Debugger removal (`drop_debugger: true`)
- ✅ Dead code elimination
- ✅ Variable name mangling
- ✅ Function optimization

### CSS Minification Options
Uses CleanCSS with level 2 optimizations:
- ✅ Whitespace removal
- ✅ Comment removal
- ✅ Property optimization
- ✅ Selector optimization

## Deployment Integration

### Automatic Deployment
The build system integrates with existing deployment scripts:

```bash
# Linux/Mac - Builds and deploys
./build-and-deploy.sh

# Windows - Builds and deploys
build-and-deploy.bat
```

### Manual Deployment
1. Build production version: `npm run build`
2. Copy files from `dist/` to your web server
3. Or run existing deploy scripts after copying

## Troubleshooting

### Common Issues

**"Node.js not found"**
- Install Node.js from [nodejs.org](https://nodejs.org/)

**"npm install fails"**
- Try: `npm cache clean --force`
- Delete `node_modules` and run `npm install` again

**"Build fails with errors"**
- Check JavaScript syntax errors
- Run development build first: `npm run build:dev`

**"Minified code doesn't work"**
- Test with development build first
- Check browser console for errors
- Some dynamic code might need exclusion from minification

**"Server configuration issues"**
- Delete `config/serverConfig.js` and run build again for fresh setup
- Check that your server supports the chosen endpoint type
- Verify the basePath matches your actual deployment path

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run build
```

## Performance Tips

1. **Use production builds** for deployment (60%+ smaller files)
2. **Enable cache busting** for proper browser cache invalidation
3. **Test minified builds** before deployment
4. **Monitor build times** - typical builds take 10-30 seconds

## Build Info

Each build generates `build-info.json` with comprehensive metadata:
```json
{
  "buildTime": "2024-01-01T12:00:00.000Z",
  "buildTimestamp": 1704067200000,
  "mode": "production",
  "gameVersion": "1.3.1",
  "cacheHash": "abc12345",
  "fileMap": {
    "game-modular.js": "game-modular.abc12345.js"
  },
  "buildSystemVersion": "1.0.0"
}
```

### Build Info Fields
- **`gameVersion`** - Current game version from gameConfig.js
- **`buildTime`** - Human-readable build timestamp  
- **`buildTimestamp`** - Unix timestamp for programmatic use
- **`mode`** - Build mode (development/production)
- **`cacheHash`** - Hash used for file renaming
- **`fileMap`** - Mapping of original → renamed files
- **`buildSystemVersion`** - Version of the build system itself

## Contributing

To modify the build system:
1. Edit `build.js` for build logic changes
2. Update `package.json` for new dependencies
3. Test with both `--dev` and production builds
4. Update this documentation

---

**Happy Building! 🚀** 