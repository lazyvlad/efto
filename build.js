#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const { glob } = require('glob');
const chalk = require('chalk');

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

    async processJavaScript() {
        this.log('📦 Processing JavaScript files...', 'info');
        
        const allJsFiles = [];
        for (const pattern of CONFIG.jsFiles) {
            const files = await glob(pattern, { cwd: CONFIG.srcDir });
            allJsFiles.push(...files);
        }

        for (const file of allJsFiles) {
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