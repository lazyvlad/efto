# EFTO Game

A JavaScript HTML5 game with a simple build system.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Commands

| Command | Description | Output |
|---------|-------------|---------|
| `npm run build` | Production build (minified, optimized) | `dist/` |
| `npm run build:dev` | Development build (unminified, debug-friendly) | `dev_dist/` |
| `npm run clean` | Clean both build directories | - |

### 3. Local Development Server
```bash
# Start Python server (if you have Python)
./start_server.sh    # Linux/Mac
start_server.bat     # Windows

# Or use any HTTP server to serve the dist/ or dev_dist/ folder
```

## Build Output

- **Production** (`npm run build`): 
  - Outputs to `dist/`
  - Files are minified
  - Debug logs removed
  - Cache-busted filenames (e.g., `game-modular.abc123.js`)

- **Development** (`npm run build:dev`):
  - Outputs to `dev_dist/`
  - Files are unminified
  - Debug logs preserved
  - Original filenames

## Game Features

- HTML5 Canvas game
- Mobile-responsive design  
- Audio system
- High score tracking
- Multiple game systems (spells, items, etc.)

## Project Structure

```
efto/
├── game-modular.js         # Main game file
├── classes/                # Game classes
├── systems/                # Game systems
├── utils/                  # Utilities
├── data/                   # Game data
├── styles/                 # CSS files
├── assets/                 # Game assets
├── config/                 # Configuration
└── build.js                # Build system
``` 