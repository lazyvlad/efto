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

## Deploying (pull and build on the server)

The server needs a web server with PHP, plus Node.js and git. The project folder is the web root.

First time:
```bash
git clone https://github.com/lazyvlad/efto.git .
npm install
npm run build                        # asks for the server type once: choose "PHP Server"
echo "EFTO_ENV=production" > .env    # serve the built game from dist/
echo "[]" > highscores.json
chown <web-user> highscores.json     # the web server must be able to write scores
```

Each release:
```bash
git pull
npm install
npm run build
```

- High scores live in `highscores.json` in the project root. It is not tracked by git and not part
  of the build, so pulling and rebuilding never touch it.
- Make sure the web server does not serve `.env`, `.git/` or `node_modules/`.
- To go back to serving the unbuilt source, set `EFTO_ENV=development` in `.env`.

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