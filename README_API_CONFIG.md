# API Configuration Guide

This document explains how to configure the API settings for different deployment scenarios when hosting the game in nested folders or subdirectories.

## Configuration System

The game now uses a **separate configuration file** that can be easily modified on production servers without touching the main game code.

### Configuration Files

1. **`config/serverConfig.js`** - The actual configuration file used by the game
2. **`config/serverConfig.example.js`** - Example/template file with documentation

## Quick Setup

### For New Deployments

1. **Copy the example file:**
   ```bash
   cp config/serverConfig.example.js config/serverConfig.js
   ```

2. **Edit the configuration:**
   ```javascript
   // config/serverConfig.js
   export const serverConfig = {
       basePath: '/your-deployment-path',  // Change this!
       endpoints: {
           highscores: 'api/highscores.php'
       },
       isDevelopment: false
   };
   ```

3. **Upload to your server**

### For Existing Deployments

Simply modify `config/serverConfig.js` on your production server - you don't need to change any other files!

## Configuration Examples

### 1. Root Directory (Default)
**URL:** `https://yourdomain.com/`
**Configuration:**
```javascript
export const serverConfig = {
    basePath: '',
    endpoints: {
        highscores: 'api/highscores.php'
    },
    isDevelopment: false
};
```
**Results in:** `https://yourdomain.com/api/highscores.php`

### 2. Single Subdirectory
**URL:** `https://yourdomain.com/game/`
**Configuration:**
```javascript
export const serverConfig = {
    basePath: '/game',
    endpoints: {
        highscores: 'api/highscores.php'
    },
    isDevelopment: false
};
```
**Results in:** `https://yourdomain.com/game/api/highscores.php`

### 3. Nested Folders
**URL:** `https://yourdomain.com/projects/efto/`
**Configuration:**
```javascript
export const serverConfig = {
    basePath: '/projects/efto',
    endpoints: {
        highscores: 'api/highscores.php'
    },
    isDevelopment: false
};
```
**Results in:** `https://yourdomain.com/projects/efto/api/highscores.php`

### 4. Using Python Server
**Configuration:**
```javascript
export const serverConfig = {
    basePath: '/your-path',  // or '' for root
    endpoints: {
        highscores: 'api/highscores'  // Note: no .php extension
    },
    isDevelopment: false
};
```

### 5. GitHub Pages
**Configuration:**
```javascript
export const serverConfig = {
    basePath: '/repository-name',  // Your GitHub repo name
    endpoints: {
        highscores: 'api/highscores.php'
    },
    isDevelopment: false
};
```

## Auto-Detection Feature

The system includes **automatic path detection** that tries to determine the correct `basePath` based on the current URL. This works for many common scenarios without manual configuration.

To use auto-detection:
```javascript
export const serverConfig = {
    basePath: '',  // Leave empty for auto-detection
    endpoints: {
        highscores: 'api/highscores.php'
    },
    isDevelopment: true  // Enable to see auto-detection logs
};
```

## Environment-Like Usage

While client-side apps can't use `.env` files directly, you can simulate this workflow:

### Option 1: Script-Based Deployment
Create a deployment script that replaces values in `serverConfig.js`:

```bash
#!/bin/bash
# deploy.sh
BASE_PATH="/production/path"
sed -i "s|basePath: ''|basePath: '$BASE_PATH'|g" config/serverConfig.js
```

### Option 2: Template Replacement
Use a template system to replace placeholders:

```javascript
// config/serverConfig.template.js
export const serverConfig = {
    basePath: '{{BASE_PATH}}',
    endpoints: {
        highscores: '{{API_ENDPOINT}}'
    },
    isDevelopment: {{IS_DEVELOPMENT}}
};
```

## Setup Instructions

1. **Determine your deployment path:**
   - If hosting at `https://yourdomain.com/`, use `basePath: ''`
   - If hosting at `https://yourdomain.com/subfolder/`, use `basePath: '/subfolder'`
   - If hosting at `https://yourdomain.com/path/to/game/`, use `basePath: '/path/to/game'`

2. **Create/Update the configuration:**
   - Copy `config/serverConfig.example.js` to `config/serverConfig.js`
   - Or directly edit `config/serverConfig.js` on your server
   - Modify the `basePath` value according to your deployment path
   - Ensure the `endpoints.highscores` matches your server setup (PHP or Python)

3. **Test the configuration:**
   - Load the game in your browser
   - Check the browser console for any API errors
   - Try submitting a high score to verify the API is working

## Important Notes

- **Only `config/serverConfig.js` needs to be modified** on production servers
- The `basePath` should start with `/` and NOT end with `/`
- The system automatically handles URL construction to avoid double slashes
- If the server API is unavailable, the game will fall back to localStorage
- Make sure your server files (`api/highscores.php` or `server.py`) are in the correct location relative to your game files

## Troubleshooting

### API Not Found (404 Error)
- Check that your `basePath` matches your actual deployment path
- Verify that the API files are uploaded to the correct location
- Test the API URL directly in your browser
- Enable `isDevelopment: true` to see auto-detection logs

### CORS Issues
- Ensure your server has CORS headers configured (already included in the provided PHP/Python files)
- If using a different server setup, add appropriate CORS headers

### Permission Issues
- Make sure the web server can write to the directory containing `highscores.json`
- Check file permissions for the API files and data directory

### Configuration File Not Found
- Ensure `config/serverConfig.js` exists (copy from `serverConfig.example.js`)
- Check that the file is uploaded to the correct location on your server 