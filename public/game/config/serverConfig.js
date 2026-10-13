/**
 * Server Configuration
 * 
 * Generated automatically by the build system on 2025-06-30T11:25:08.170Z
 * 
 * This file can be modified on the production server to set deployment-specific settings
 * without touching the main gameConfig.js file.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Upload this file to your server alongside the game files
 * 2. Modify the values below to match your server setup
 * 3. The game will automatically use these settings
 */

export const serverConfig = {
    // API Base Path Configuration
    // Set this to match your deployment path
    // Current setting: Auto-detect
    basePath: '',

    // API Endpoints
    // Server type: PHP Server
    endpoints: {
        highscores: 'api/highscores.php',
    },

    // Development vs Production settings
    // Set to true on development servers for extra logging
    isDevelopment: false,
};

// Auto-detect some common deployment scenarios
// This runs when the file is loaded and can auto-configure basePath
(function autoDetectBasePath() {
    // Don't auto-detect if basePath is already set
    if (serverConfig.basePath !== '') {
        return;
    }

    // Get current path and try to auto-detect deployment folder
    const currentPath = window.location.pathname;
    
    // If we're not at root, try to extract the base path
    if (currentPath !== '/' && currentPath !== '/index.html' && currentPath !== '/index-modular.html') {
        // Extract directory path (remove filename)
        const pathParts = currentPath.split('/');
        pathParts.pop(); // Remove filename
        
        // If we have path parts and it's not just root
        if (pathParts.length > 1 || (pathParts.length === 1 && pathParts[0] !== '')) {
            const detectedPath = pathParts.join('/');
            if (detectedPath !== '') {
                serverConfig.basePath = detectedPath;
            }
        }
    }
})();
