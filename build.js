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
    distDir: 'dist',
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
        drop_console: true,  // Remove console.log statements
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
        cascade: true,
        side_effects: true
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
        this.cacheHash = this.generateCacheHash();
        this.fileMap = new Map(); // For tracking renamed files
    }

    generateCacheHash() {
        if (!CONFIG.addCacheBusting) return '';
        return Date.now().toString(36).substr(-8);
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
        
        // Clean dist directory
        await fs.remove(CONFIG.distDir);
        await fs.ensureDir(CONFIG.distDir);
        
        this.log('✨ Cleaned dist directory', 'success');
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

    async processJavaScript() {
        this.log('📦 Processing JavaScript files...', 'info');
        
        const allJsFiles = [];
        for (const pattern of CONFIG.jsFiles) {
            const files = await glob(pattern, { cwd: CONFIG.srcDir });
            allJsFiles.push(...files);
        }

        for (const file of allJsFiles) {
            // Skip serverConfig.js as it's handled separately
            if (file === 'config/serverConfig.js') {
                continue;
            }
            
            const srcPath = path.join(CONFIG.srcDir, file);
            const content = await fs.readFile(srcPath, 'utf8');
            
            let processedContent = content;
            let outputFilename = file;

            if (!CONFIG.isDev) {
                // Minify JavaScript and remove console logs
                try {
                    const result = await minify(content, TERSER_OPTIONS);
                    processedContent = result.code;
                    this.log(`✅ Minified: ${file} (${this.getFileSizeReduction(content, processedContent)})`, 'success');
                } catch (error) {
                    this.log(`❌ Error minifying ${file}: ${error.message}`, 'error');
                    processedContent = content; // Fallback to original
                }

                // Add cache busting to main files
                if (CONFIG.addCacheBusting && ['game-modular.js'].includes(file)) {
                    const ext = path.extname(file);
                    const name = path.basename(file, ext);
                    outputFilename = `${name}.${this.cacheHash}${ext}`;
                    this.fileMap.set(file, outputFilename);
                }
            } else {
                this.log(`📋 Copied: ${file}`, 'info');
            }

            const destPath = path.join(CONFIG.distDir, outputFilename);
            await fs.ensureDir(path.dirname(destPath));
            await fs.writeFile(destPath, processedContent);
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

            if (!CONFIG.isDev) {
                // Minify CSS
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
                }
            } else {
                this.log(`📋 Copied: ${file}`, 'info');
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
            
            // Update file references for cache busting
            if (!CONFIG.isDev && CONFIG.addCacheBusting) {
                for (const [originalFile, newFile] of this.fileMap) {
                    content = content.replace(new RegExp(originalFile, 'g'), newFile);
                }
            }

            // Add build info comment
            const buildComment = `<!-- Built: ${this.buildTime} | Mode: ${CONFIG.isDev ? 'Development' : 'Production'} -->`;
            content = content.replace('</head>', `  ${buildComment}\n</head>`);

            const destPath = path.join(CONFIG.distDir, file);
            await fs.writeFile(destPath, content);
            this.log(`📋 Processed: ${file}`, 'success');
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
            mode: CONFIG.isDev ? 'development' : 'production',
            cacheHash: this.cacheHash,
            fileMap: Object.fromEntries(this.fileMap),
            version: require('./package.json').version
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
            await this.setupServerConfig();
            await this.processJavaScript();
            await this.processCSS();
            await this.processHTML();
            await this.copyAssets();
            await this.generateBuildInfo();
            
            this.log(`🎉 Build completed successfully! Output: ${CONFIG.distDir}/`, 'success');
            
            if (!CONFIG.isDev) {
                this.log('🏭 Production optimizations applied:', 'info');
                this.log('  ✅ JavaScript minified', 'success');
                this.log('  ✅ Console logs removed', 'success');
                this.log('  ✅ CSS minified', 'success');
                if (CONFIG.addCacheBusting) {
                    this.log('  ✅ Cache busting applied', 'success');
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