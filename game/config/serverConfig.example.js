/**
 * Server Configuration Example
 * 
 * Copy this file to serverConfig.js and modify the values below to match your deployment.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Copy this file: cp serverConfig.example.js serverConfig.js
 * 2. Edit serverConfig.js with your production settings
 * 3. Upload serverConfig.js to your server
 * 4. The game will automatically use your settings
 */

export const serverConfig = {
    // API Base Path Configuration
    // Set this to match your deployment path
    // Examples:
    // - Root directory: ''
    // - Subdirectory: '/game'  
    // - Nested path: '/projects/efto'
    // - GitHub Pages: '/repository-name' (if not using custom domain)
    basePath: '',

    // API Endpoints (choose based on your server setup)
    endpoints: {
        // For PHP servers (default)
        highscores: 'api/highscores.php',
        
        // For Python/Flask servers, use this instead:
        // highscores: 'api/highscores',
        
        // For custom endpoints:
        // highscores: 'custom/path/to/api',
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
                if (serverConfig.isDevelopment) {
                    console.log('Auto-detected basePath:', detectedPath);
                }
            }
        }
    }
})(); 