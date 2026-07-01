#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { glob } = require('glob');
const chalk = require('chalk');
const readlineSync = require('readline-sync');

// Configuration
const CONFIG = {
    srcDir: '.',
    distDir: process.argv.includes('--dev') ? 'dev_dist' : 'dist',
    isDev: process.argv.includes('--dev'),
    addCacheBusting: !process.argv.includes('--no-cache'),
    
    // Files to process
    jsFiles: [
        'game-modular.js',
        'classes/**/*.js',
        'systems/**/*.js',
        'ui/**/*.js',
        'utils/**/*.js',
        'data/**/*.js',
        'config/**/*.js'
    ],
    cssFiles: [
        'styles/**/*.css'
    ],
    htmlFiles: [
        'index.html',
        'test-mobile.html'
    ],
    assetDirs: [
        'assets',
        'items',
        'api'
    ],
    copyFiles: [
        'favicon.svg',
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
        'site.webmanifest',
        'highscores.json',
        'requirements.txt',
        'server.py',
        'start_server.sh',
        'start_server.bat'
    ]
    // Note: serverConfig.js is handled separately by setupServerConfig()
};

// Terser options for production
const TERSER_OPTIONS = {
    compress: {
        drop_console: true,  // Let Terser handle console.log removal safely
        drop_debugger: true, // Remove debugger statements
        dead_code: true,
        unused: true,
        conditionals: true,
        comparisons: true,
        evaluate: true,
        booleans: true,
        loops: true,
        hoist_funs: true,
        keep_fargs: false,
        hoist_vars: false,
        if_return: true,
        join_vars: true,
        side_effects: false  // Changed from true to prevent aggressive optimization that might break code
    },
    mangle: {
        toplevel: false,
        keep_fnames: false
    },
    format: {
        comments: false
    }
};

// CleanCSS options
const CLEANCSS_OPTIONS = {
    level: 2,
    compatibility: 'ie8'
};

class BuildSystem {
    constructor() {
        this.buildTime = new Date().toISOString();
        this.cacheHash = null; // Will be generated fresh for each build
        this.fileMap = new Map(); // For tracking renamed files
        this.gameVersion = null;
        this.buildTimestamp = Date.now();
    }

    generateCacheHash() {
        if (!CONFIG.addCacheBusting) return '';
        // Generate a more robust hash using timestamp + random component
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 4);
        return (timestamp + random).substr(-8);
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red
        };
        console.log(`[${timestamp}] ${colors[type] || chalk.white}(${message})`);
    }

    async init() {
        this.log('🚀 Starting EFTO Game Build System', 'info');
        this.log(`Mode: ${CONFIG.isDev ? 'Development' : 'Production'}`, 'info');
        
        // Generate fresh cache hash for this build
        this.cacheHash = this.generateCacheHash();
        
        if (!CONFIG.isDev && CONFIG.addCacheBusting) {
            this.log(`🔢 Generated fresh cache hash: ${this.cacheHash}`, 'info');
        }
        
        // Clean dist directory
        await fs.remove(CONFIG.distDir);
        await fs.ensureDir(CONFIG.distDir);
        
        this.log('✨ Cleaned dist directory', 'success');
    }

    async setupGameVersion() {
        this.log('🏷️  Checking game version...', 'info');
        
        const gameVersionPath = path.join(CONFIG.srcDir, 'config', 'gameVersion.js');
        const defaultVersion = this.getDefaultGameVersion();
        
        // Read current version from gameVersion.js
        try {
            let gameVersionContent;
            if (await fs.pathExists(gameVersionPath)) {
                gameVersionContent = await fs.readFile(gameVersionPath, 'utf8');
            } else {
                this.log('🔧 gameVersion.js missing, generating it for this build', 'info');
                this.gameVersion = process.env.EFTO_BUILD_VERSION || defaultVersion;
                await this.writeGameVersionFile(gameVersionPath, this.gameVersion);
                this.log(`✅ Generated gameVersion.js: ${this.gameVersion}`, 'success');
                return;
            }

            const versionMatch = gameVersionContent.match(/export const GAME_VERSION = ["']([^"']+)["']/);
            
            if (versionMatch) {
                const currentVersion = versionMatch[1];
                this.log(`📋 Current game version: ${currentVersion}`, 'info');
                
                const envVersion = process.env.EFTO_BUILD_VERSION;
                const canPrompt = Boolean(process.stdin.isTTY);
                let updateVersion = false;
                
                if (envVersion) {
                    this.gameVersion = envVersion;
                    await this.updateGameVersion(gameVersionPath, gameVersionContent);
                    this.log(`✅ Updated game version from EFTO_BUILD_VERSION: ${this.gameVersion}`, 'success');
                    return;
                }
                
                if (canPrompt) {
                    // Ask user if they want to update the version
                    updateVersion = readlineSync.keyInYNStrict(
                        `Do you want to update the game version? (current: ${currentVersion})`
                    );
                } else {
                    this.log('📋 Non-interactive build detected, keeping current version', 'info');
                }
                
                if (updateVersion) {
                    this.gameVersion = this.promptForNewVersion(currentVersion);
                    await this.updateGameVersion(gameVersionPath, gameVersionContent);
                    this.log(`✅ Updated game version to: ${this.gameVersion}`, 'success');
                } else {
                    this.gameVersion = currentVersion;
                    // Still update the build timestamp
                    await this.updateGameVersion(gameVersionPath, gameVersionContent, false);
                    this.log(`📋 Keeping current version: ${this.gameVersion}`, 'info');
                }
            } else {
                this.log('⚠️  Could not find GAME_VERSION in gameVersion.js', 'warning');
                this.gameVersion = process.env.EFTO_BUILD_VERSION || (
                    process.stdin.isTTY ? readlineSync.question('🏷️  Enter game version: ', {
                        defaultInput: defaultVersion
                    }) : defaultVersion
                );
                await this.updateGameVersion(gameVersionPath, gameVersionContent);
            }
        } catch (error) {
            this.log(`❌ Error reading gameVersion.js: ${error.message}`, 'error');
            this.gameVersion = process.env.EFTO_BUILD_VERSION || defaultVersion;
            await this.writeGameVersionFile(gameVersionPath, this.gameVersion);
            this.log(`✅ Recovered by generating gameVersion.js: ${this.gameVersion}`, 'success');
        }
    }

    getDefaultGameVersion() {
        try {
            const packageJson = require('./package.json');
            return packageJson.version || '1.0.0';
        } catch (error) {
            return '1.0.0';
        }
    }
    
    promptForNewVersion(currentVersion) {
        console.log('');
        console.log(chalk.cyan('🏷️  Game Version Update'));
        console.log(chalk.gray('Current version: ') + chalk.yellow(currentVersion));
        console.log('');
        console.log('Suggested version increments:');
        
        const versionParts = currentVersion.split('.');
        const major = parseInt(versionParts[0]) || 1;
        const minor = parseInt(versionParts[1]) || 0;
        const patch = parseInt(versionParts[2]) || 0;
        
        console.log(`  Patch: ${major}.${minor}.${patch + 1} (bug fixes)`);
        console.log(`  Minor: ${major}.${minor + 1}.0 (new features)`);
        console.log(`  Major: ${major + 1}.0.0 (breaking changes)`);
        console.log('');
        
        return readlineSync.question('🏷️  Enter new version: ', {
            defaultInput: `${major}.${minor}.${patch + 1}`
        });
    }
    
    async updateGameVersion(gameVersionPath, content, updateVersion = true) {
        let updatedContent = content;
        
        if (updateVersion) {
            // Update GAME_VERSION
            updatedContent = updatedContent.replace(
                /export const GAME_VERSION = ["'][^"']+["']/,
                `export const GAME_VERSION = "${this.gameVersion}"`
            );
        }
        
        // Always update BUILD_TIMESTAMP
        updatedContent = updatedContent.replace(
            /export const BUILD_TIMESTAMP = \d+/,
            `export const BUILD_TIMESTAMP = ${this.buildTimestamp}`
        );
        
        await fs.writeFile(gameVersionPath, updatedContent);
    }

    async writeGameVersionFile(gameVersionPath, version) {
        const content = `// ===== GAME VERSION & CACHE BUSTING =====
// Generated by build.js. Do not edit directly; set EFTO_BUILD_VERSION or package.json version.
export const GAME_VERSION = "${version}";
export const BUILD_TIMESTAMP = ${this.buildTimestamp}; // Set during build/deployment
`;

        await fs.ensureDir(path.dirname(gameVersionPath));
        await fs.writeFile(gameVersionPath, content);
    }

    async setupServerConfig() {
        this.log('⚙️  Checking server configuration...', 'info');
        
        const serverConfigPath = path.join(CONFIG.srcDir, 'config', 'serverConfig.js');
        const exampleConfigPath = path.join(CONFIG.srcDir, 'config', 'serverConfig.example.js');
        const distConfigDir = path.join(CONFIG.distDir, 'config');
        const distServerConfigPath = path.join(distConfigDir, 'serverConfig.js');
        
        // Ensure dist config directory exists
        await fs.ensureDir(distConfigDir);
        
        // Check if serverConfig.js exists
        const configExists = await fs.pathExists(serverConfigPath);
        
        if (configExists) {
            // Copy existing config to dist
            await fs.copy(serverConfigPath, distServerConfigPath);
            this.log('✅ Found existing serverConfig.js, copied to dist', 'success');
            return;
        }
        
        // Check if example exists
        const exampleExists = await fs.pathExists(exampleConfigPath);
        if (!exampleExists) {
            this.log('⚠️  No serverConfig.example.js found, skipping server config setup', 'warning');
            return;
        }
        
        this.log('🔧 No serverConfig.js found!', 'warning');
        this.log('📋 The game needs a server configuration file to work properly.', 'info');
        
        // Ask user if they want to create the config
        const createConfig = readlineSync.keyInYNStrict(
            'Would you like to create serverConfig.js now?'
        );
        
        if (!createConfig) {
            this.log('⏭️  Skipping server config setup. You can create it manually later.', 'warning');
            return;
        }
        
        this.log('🔧 Setting up server configuration...', 'info');
        console.log('');
        
        // Gather configuration from user
        const config = await this.gatherServerConfig();
        
        // Generate the config file content
        const configContent = this.generateServerConfigContent(config);
        
        // Write to both source and dist directories
        await fs.writeFile(serverConfigPath, configContent);
        await fs.writeFile(distServerConfigPath, configContent);
        
        this.log('✅ Created serverConfig.js in both source and dist directories', 'success');
        this.log(`📁 Source: ${serverConfigPath}`, 'info');
        this.log(`📁 Dist: ${distServerConfigPath}`, 'info');
    }
    
    async gatherServerConfig() {
        console.log(chalk.cyan('📋 Server Configuration Setup'));
        console.log(chalk.gray('Please provide the following configuration details:\n'));
        
        // Base Path Configuration
        console.log(chalk.yellow('1. Deployment Path Configuration'));
        console.log('   This is where your game will be deployed on the server.');
        console.log('   Examples:');
        console.log('   - Root directory (most common): leave empty');
        console.log('   - Subdirectory: /game');
        console.log('   - Nested path: /projects/efto');
        console.log('   - GitHub Pages: /repository-name');
        console.log('');
        
        const basePath = readlineSync.question('🔗 Enter the base path (or press Enter for root): ', {
            defaultInput: ''
        }).trim();
        
        // Server Type Configuration
        console.log('\n' + chalk.yellow('2. Server Type Configuration'));
        console.log('   Choose your server backend type:');
        console.log('   1. PHP Server (uses api/highscores.php)');
        console.log('   2. Python/Flask Server (uses api/highscores)');
        console.log('   3. Custom endpoint');
        console.log('');
        
        const serverTypeChoices = ['PHP Server', 'Python/Flask Server', 'Custom endpoint'];
        const serverTypeIndex = readlineSync.keyInSelect(serverTypeChoices, '🖥️  Select server type:', { cancel: false });
        
        let highscoresEndpoint;
        switch (serverTypeIndex) {
            case 0: // PHP
                highscoresEndpoint = 'api/highscores.php';
                break;
            case 1: // Python
                highscoresEndpoint = 'api/highscores';
                break;
            case 2: // Custom
                highscoresEndpoint = readlineSync.question('🔗 Enter custom highscores endpoint: ', {
                    defaultInput: 'api/highscores'
                });
                break;
        }
        
        // Development Mode
        console.log('\n' + chalk.yellow('3. Environment Configuration'));
        const isDevelopment = readlineSync.keyInYNStrict('🔍 Is this a development environment? (enables extra logging)');
        
        console.log('');
        
        return {
            basePath,
            highscoresEndpoint,
            isDevelopment,
            serverType: serverTypeChoices[serverTypeIndex]
        };
    }
    
    generateServerConfigContent(config) {
        const timestamp = new Date().toISOString();
        
        return `/**
 * Server Configuration
 * 
 * Generated automatically by the build system on ${timestamp}
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
    // Current setting: ${config.basePath || 'Root directory'}
    basePath: '${config.basePath}',

    // API Endpoints
    // Server type: ${config.serverType}
    endpoints: {
        highscores: '${config.highscoresEndpoint}',
    },

    // Development vs Production settings
    // Set to true on development servers for extra logging
    isDevelopment: ${config.isDevelopment},
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
`;
        }
    
    removeDebugLogs(content, filename) {
        // TEMPORARILY DISABLED: Console.log removal is causing syntax errors with complex template literals
        // For now, we'll let Terser handle console.log removal through its built-in drop_console option
        
        if (!CONFIG.isDev) {
            const consoleLogCount = (content.match(/console\.log/g) || []).length;
            if (consoleLogCount > 0) {
                this.log(`⚠️  Found ${consoleLogCount} console.log statements in ${filename} (will be removed by minifier)`, 'warn');
            }
        }
        
        // Return original content without modification - let Terser handle console.log removal
        return content;
    }
    
    async processJavaScript() {
        this.log('📦 Processing JavaScript files...', 'info');
        
        const allJsFiles = [];
        for (const pattern of CONFIG.jsFiles) {
            const files = await glob(pattern, { cwd: CONFIG.srcDir });
            allJsFiles.push(...files);
        }
        
        this.log(`📋 Found ${allJsFiles.length} JavaScript files to process`, 'info');

        for (const file of allJsFiles) {
            // Skip serverConfig.js as it's handled separately
            if (file === 'config/serverConfig.js') {
                continue;
            }
            
            const srcPath = path.join(CONFIG.srcDir, file);
            
            // Read file content (gameVersion.js will have updated version/timestamp at this point)
            const content = await fs.readFile(srcPath, 'utf8');
            
            let processedContent = content;
            let outputFilename = file;

            if (!CONFIG.isDev) {
                // First: Remove most console.log statements (keep only critical ones)
                processedContent = this.removeDebugLogs(processedContent, file);
                
                // Then: Minify JavaScript 
                try {
                    const result = await minify(processedContent, TERSER_OPTIONS);
                    processedContent = result.code;
                    this.log(`✅ Minified: ${file} (${this.getFileSizeReduction(content, processedContent)})`, 'success');
                } catch (error) {
                    this.log(`❌ Error minifying ${file}: ${error.message}`, 'error');
                    this.log(`⚠️  Using unminified but debug-cleaned version`, 'warning');
                    // Keep processedContent (with debug logs removed) instead of reverting to original
                }

                // Add cache busting to main files
                if (CONFIG.addCacheBusting && ['game-modular.js'].includes(file)) {
                    const ext = path.extname(file);
                    const name = path.basename(file, ext);
                    outputFilename = `${name}.${this.cacheHash}${ext}`;
                    this.fileMap.set(file, outputFilename);
                    this.log(`🔄 Cache busting: ${file} → ${outputFilename} (hash: ${this.cacheHash})`, 'info');
                }
            } else {
                this.log(`📋 Copied: ${file}`, 'info');
            }

            const destPath = path.join(CONFIG.distDir, outputFilename);
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, processedContent);
        }
        
        if (!CONFIG.isDev && CONFIG.addCacheBusting) {
            this.log(`📋 File mappings created:`, 'info');
            for (const [original, renamed] of this.fileMap) {
                this.log(`  ${original} → ${renamed}`, 'info');
                
                // Verify the file actually exists
                const destPath = path.join(CONFIG.distDir, renamed);
                const exists = await fs.pathExists(destPath);
                this.log(`  📁 File exists: ${exists ? '✅' : '❌'} ${renamed}`, exists ? 'success' : 'error');
            }
        }
    }

    async processCSS() {
        this.log('🎨 Processing CSS files...', 'info');
        
        const allCssFiles = [];
        for (const pattern of CONFIG.cssFiles) {
            const files = await glob(pattern, { cwd: CONFIG.srcDir });
            allCssFiles.push(...files);
        }

        for (const file of allCssFiles) {
            const srcPath = path.join(CONFIG.srcDir, file);
            const content = await fs.readFile(srcPath, 'utf8');
            
            let processedContent = content;
            let outputFilename = file;

            // Always minify CSS for builds (both production and development)
            // This keeps source files unminified for development, but builds are optimized
            try {
                const result = new CleanCSS(CLEANCSS_OPTIONS).minify(content);
                if (result.errors.length > 0) {
                    throw new Error(result.errors.join(', '));
                }
                processedContent = result.styles;
                this.log(`✅ Minified: ${file} (${this.getFileSizeReduction(content, processedContent)})`, 'success');
            } catch (error) {
                this.log(`❌ Error minifying ${file}: ${error.message}`, 'error');
                processedContent = content; // Fallback to original
                this.log(`📋 Using unminified fallback for: ${file}`, 'warning');
            }

            const destPath = path.join(CONFIG.distDir, outputFilename);
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, processedContent);
        }
    }

    async processHTML() {
        this.log('📄 Processing HTML files...', 'info');
        
        for (const file of CONFIG.htmlFiles) {
            const srcPath = path.join(CONFIG.srcDir, file);
            
            if (!await fs.pathExists(srcPath)) {
                this.log(`⚠️  HTML file not found: ${file}`, 'warning');
                continue;
            }

            let content = await fs.readFile(srcPath, 'utf8');
            this.log(`📋 Processing ${file}...`, 'info');
            
            // First: Handle file references based on build mode
            if (!CONFIG.isDev && CONFIG.addCacheBusting && this.fileMap.size > 0) {
                // PRODUCTION: Apply file mappings for cache busting
                this.log(`  🔄 Applying ${this.fileMap.size} file mappings...`, 'info');
                for (const [originalFile, newFile] of this.fileMap) {
                    const beforeContent = content;
                    
                    // Extract the base name and extension from original file
                    const ext = path.extname(originalFile);
                    const baseName = path.basename(originalFile, ext);
                    
                    // Create regex to match any hashed version of this file
                    // e.g., game-modular.js matches game-modular.*.js or game-modular.abcd1234.js
                    const hashedPattern = `${baseName}\\.[a-z0-9]+${ext.replace('.', '\\.')}`;
                    const basePattern = originalFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    
                    // Try to replace hashed versions first (from previous builds)
                    const hashedRegex = new RegExp(hashedPattern, 'g');
                    const hashedMatches = content.match(hashedRegex);
                    
                    if (hashedMatches) {
                        this.log(`  🔍 Found existing hashed versions: ${hashedMatches.join(', ')}`, 'info');
                        content = content.replace(hashedRegex, newFile);
                        this.log(`  ✅ Replaced hashed versions with: ${newFile}`, 'success');
                    } else {
                        // Fallback: try to replace the original filename
                        content = content.replace(new RegExp(basePattern, 'g'), newFile);
                        if (content !== beforeContent) {
                            this.log(`  ✅ Replaced original file: ${originalFile} → ${newFile}`, 'success');
                        } else {
                            this.log(`  ⚠️  No matches found for: ${originalFile}`, 'warning');
                        }
                    }
                }
            } else if (CONFIG.isDev) {
                // DEVELOPMENT: Clean up any existing hashed references from previous production builds
                this.log(`  🧹 Cleaning up hashed file references for development...`, 'info');
                
                // List of files that might have been hashed in previous builds
                const filesToCleanup = ['game-modular.js'];
                
                for (const originalFile of filesToCleanup) {
                    const beforeContent = content;
                    const ext = path.extname(originalFile);
                    const baseName = path.basename(originalFile, ext);
                    
                    // Create regex to match any hashed version of this file
                    const hashedPattern = `${baseName}\\.[a-z0-9]+${ext.replace('.', '\\.')}`;
                    const hashedRegex = new RegExp(hashedPattern, 'g');
                    const hashedMatches = content.match(hashedRegex);
                    
                    if (hashedMatches) {
                        this.log(`  🔍 Found hashed versions to clean: ${hashedMatches.join(', ')}`, 'info');
                        content = content.replace(hashedRegex, originalFile);
                        this.log(`  ✅ Restored original filename: ${originalFile}`, 'success');
                    }
                }
            } else if (!CONFIG.isDev && CONFIG.addCacheBusting) {
                this.log(`  ℹ️  No file mappings to apply`, 'info');
            }

            // Second: Update version parameters in script and link tags
            if (this.gameVersion) {
                // Update script src with version parameter (simplified approach)
                const scriptBeforeContent = content;
                
                // Handle script tags - simple and reliable approach
                content = content.replace(
                    /(<script[^>]+src="[^"]+)\?v=[^"&]*([^"]*"[^>]*>)/g,
                    `$1?v=${this.gameVersion}$2`
                );
                
                // Handle script tags without version parameter
                content = content.replace(
                    /(<script[^>]+src="[^"]+)("[^>]*>)/g,
                    (match, prefix, suffix) => {
                        if (prefix.includes('?v=')) {
                            return match; // Already handled above
                        }
                        return `${prefix}?v=${this.gameVersion}${suffix}`;
                    }
                );
                
                if (content !== scriptBeforeContent) {
                    this.log(`  ✅ Updated script version parameters to v=${this.gameVersion}`, 'success');
                }
                
                // Update link href with version parameter (for CSS files)
                const linkBeforeContent = content;
                
                // Handle CSS link tags - simple and reliable approach
                content = content.replace(
                    /(<link[^>]+href="[^"]+\.css)\?v=[^"&]*([^"]*"[^>]*>)/g,
                    `$1?v=${this.gameVersion}$2`
                );
                
                // Handle CSS link tags without version parameter
                content = content.replace(
                    /(<link[^>]+href="[^"]+\.css)("[^>]*>)/g,
                    (match, prefix, suffix) => {
                        if (prefix.includes('?v=')) {
                            return match; // Already handled above
                        }
                        return `${prefix}?v=${this.gameVersion}${suffix}`;
                    }
                );
                
                if (content !== linkBeforeContent) {
                    this.log(`  ✅ Updated CSS version parameters to v=${this.gameVersion}`, 'success');
                }
                
                // Update any hardcoded version numbers in comments or meta tags
                content = content.replace(
                    /version\s*[:=]\s*["']?[\d.]+["']?/gi,
                    `version="${this.gameVersion}"`
                );
            }

            // Add build info comment with version
            const buildComment = `<!-- Built: ${this.buildTime} | Version: ${this.gameVersion} | Mode: ${CONFIG.isDev ? 'Development' : 'Production'} -->`;
            content = content.replace('</head>', `  ${buildComment}\n</head>`);

            const destPath = path.join(CONFIG.distDir, file);
            await fs.writeFile(destPath, content);
            this.log(`📋 Processed: ${file} (version: ${this.gameVersion})`, 'success');
        }
    }

    async copyAssets() {
        this.log('📁 Copying assets...', 'info');
        
        // Copy asset directories
        for (const dir of CONFIG.assetDirs) {
            const srcPath = path.join(CONFIG.srcDir, dir);
            const destPath = path.join(CONFIG.distDir, dir);
            
            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, destPath);
                this.log(`📂 Copied directory: ${dir}`, 'success');
            }
        }

        // Copy individual files
        for (const file of CONFIG.copyFiles) {
            const srcPath = path.join(CONFIG.srcDir, file);
            const destPath = path.join(CONFIG.distDir, file);
            
            if (await fs.pathExists(srcPath)) {
                await fs.copy(srcPath, destPath);
                this.log(`📋 Copied file: ${file}`, 'success');
            }
        }
    }

    async generateBuildInfo() {
        const buildInfo = {
            buildTime: this.buildTime,
            buildTimestamp: this.buildTimestamp,
            mode: CONFIG.isDev ? 'development' : 'production',
            gameVersion: this.gameVersion,
            cacheHash: this.cacheHash,
            fileMap: Object.fromEntries(this.fileMap),
            buildSystemVersion: require('./package.json').version
        };

        await fs.writeFile(
            path.join(CONFIG.distDir, 'build-info.json'),
            JSON.stringify(buildInfo, null, 2)
        );

        this.log('📋 Generated build-info.json', 'success');
    }

    getFileSizeReduction(original, minified) {
        const originalSize = Buffer.byteLength(original, 'utf8');
        const minifiedSize = Buffer.byteLength(minified, 'utf8');
        const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        return `${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${reduction}% smaller)`;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    async run() {
        try {
            await this.init();
            await this.setupGameVersion();
            await this.setupServerConfig();
            await this.processJavaScript();
            await this.processCSS();
            await this.processHTML();
            await this.copyAssets();
            await this.generateBuildInfo();
            
            this.log(`🎉 Build completed successfully! Output: ${CONFIG.distDir}/`, 'success');
            this.log(`🏷️  Game Version: ${this.gameVersion}`, 'info');
            this.log(`📅 Build Time: ${new Date(this.buildTimestamp).toLocaleString()}`, 'info');
            
            if (!CONFIG.isDev) {
                this.log('🏭 Production optimizations applied:', 'info');
                this.log('  ✅ JavaScript minified', 'success');
                this.log('  ✅ Debug console.log statements removed', 'success');
                this.log('  ✅ CSS minified', 'success');
                this.log('  ✅ Version cache busting applied', 'success');
                if (CONFIG.addCacheBusting) {
                    this.log('  ✅ File hash cache busting applied', 'success');
                    
                    // List actual files in dist directory for verification
                    try {
                        const files = await glob('game-modular*.js', { cwd: CONFIG.distDir });
                        this.log('📄 JavaScript files in dist:', 'info');
                        for (const file of files) {
                            this.log(`  📄 ${file}`, 'info');
                        }
                        if (files.length === 0) {
                            this.log('  ⚠️  No game-modular*.js files found in dist!', 'warning');
                        }
                    } catch (error) {
                        this.log(`❌ Error listing dist files: ${error.message}`, 'error');
                    }
                }
            }
            
        } catch (error) {
            this.log(`💥 Build failed: ${error.message}`, 'error');
            console.error(error);
            process.exit(1);
        }
    }
}

// Run the build
const build = new BuildSystem();
build.run(); 