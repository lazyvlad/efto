// AssetManager.js - Centralized asset loading and management system
import { assetCategories, levelAssets, commonAssets, assetRegistry } from '../data/assetRegistry.js';
import { gameConfig } from '../config/gameConfig.js';

export class AssetManager {
    constructor() {
        this.assets = new Map(); // Cache of loaded images
        this.audioAssets = new Map(); // Cache of loaded audio
        this.loadingPromises = new Map(); // Track ongoing loads to prevent duplicates
        this.loadingQueue = []; // Queue for background loading
        this.isLoading = false;
        
        // Image dimension tracking for scaling constraints
        this.imageDimensions = new Map(); // Track original dimensions of loaded images
        this.scalingConstraints = new Map(); // Track max safe scaling per image
        
        // Loading state tracking
        this.tier1Loaded = false;
        this.tier2Loaded = false;
        this.tier3Loaded = false;
        this.totalAssetsToLoad = 0;
        this.assetsLoaded = 0;
        
        // Performance tracking
        this.loadStartTime = 0;
        this.loadStats = {
            tier1Time: 0,
            tier2Time: 0,
            tier3Time: 0,
            failedLoads: 0,
            retryAttempts: 0
        };
        
        // Callbacks
        this.onTier1ReadyCallbacks = [];
        this.onTier2ReadyCallbacks = [];
        this.onTier3ReadyCallbacks = [];
        this.onProgressCallbacks = [];
        this.onAllReadyCallbacks = [];
        
        // Placeholder image for missing assets
        this.placeholderImage = null;
        this.createPlaceholder();
        
        // Asset manifest - now built from centralized registry
        this.assetManifest = this.createAssetManifest();
        
        // Memory management
        this.maxCacheSize = 100; // Maximum number of images to keep in cache
        this.memoryUsageThreshold = 50 * 1024 * 1024; // 50MB threshold
        this.lastUsed = new Map(); // Track when assets were last accessed
        
        // Retry configuration
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second delay between retries
        
        // Dynamic manifest updates
        this.dynamicAssets = new Set();
        
        // Audio-specific properties
        this.audioInitialized = false;
        this.audioInitAttempted = false;
    }
    
    createAssetManifest() {
        return {
            // Tier 1: Critical assets from centralized registry
            tier1: assetCategories.critical,
            
            // Tier 2: Important assets from centralized registry
            tier2: assetCategories.important,
            
            // Tier 3: Optional assets from centralized registry
            tier3: assetCategories.optional
        };
    }
    
    createPlaceholder() {
        // Create a simple colored rectangle as placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Draw a simple placeholder
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, 64, 64);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 60, 60);
        ctx.fillStyle = '#999';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', 32, 36);
        
        // Convert canvas to image
        this.placeholderImage = new Image();
        this.placeholderImage.src = canvas.toDataURL();
    }
    
    // Enhanced loading with performance tracking and retry logic
    async startLoading() {
        this.loadStartTime = performance.now();
        
        // Calculate total assets for progress tracking (images + audio)
        const audioAssets = Object.values(assetRegistry.audio);
        this.totalAssetsToLoad = 
            this.assetManifest.tier1.length + 
            this.assetManifest.tier2.length +
            audioAssets.length;
        
        // Load Tier 1 (critical assets) with timing
        const tier1Start = performance.now();
        await this.loadAssetTier(this.assetManifest.tier1, 1);
        this.loadStats.tier1Time = performance.now() - tier1Start;
        this.tier1Loaded = true;
        this.notifyTier1Ready();
        
        // Load Tier 2 (important assets) and essential audio in background with timing
        const tier2Start = performance.now();
        
        // Load both Tier 2 images and essential audio in parallel
        const tier2Promise = this.loadAssetTier(this.assetManifest.tier2, 2);
        const audioPromise = this.initializeAudioSystem();
        
        Promise.allSettled([tier2Promise, audioPromise]).then(() => {
            this.loadStats.tier2Time = performance.now() - tier2Start;
            this.tier2Loaded = true;
            this.notifyTier2Ready();
            
            // Start Tier 3 background loading
            this.startBackgroundLoading();
        });
    }
    
    // Start loading Tier 3 assets in the background
    async startBackgroundLoading() {
        if (this.tier3Loaded) return;
        
        const tier3Start = performance.now();
        
        try {
            await this.loadAssetTier(this.assetManifest.tier3, 3);
            this.loadStats.tier3Time = performance.now() - tier3Start;
            this.tier3Loaded = true;
            this.notifyTier3Ready();
            this.notifyAllReady();
        } catch (error) {
            console.warn('AssetManager: Some Tier 3 assets failed to load:', error);
        }
    }
    
    async loadAssetTier(assetPaths, tier) {
        const loadPromises = assetPaths.map(path => this.loadAssetWithRetry(path, tier));
        await Promise.allSettled(loadPromises);
    }
    
    // Enhanced load asset with retry logic
    async loadAssetWithRetry(path, tier = 3, attempt = 1) {
        try {
            return await this.loadAsset(path, tier);
        } catch (error) {
            if (attempt < this.maxRetries) {
                this.loadStats.retryAttempts++;
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.loadAssetWithRetry(path, tier, attempt + 1);
            } else {
                this.loadStats.failedLoads++;
                throw error;
            }
        }
    }
    
    async loadAsset(path, tier = 3) {
        // If already loaded, update last used and return cached version
        if (this.assets.has(path)) {
            this.lastUsed.set(path, Date.now());
            return this.assets.get(path);
        }
        
        // If already loading, return existing promise
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }
        
        // Create loading promise with enhanced error handling
        const loadPromise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Store image and metadata
                this.assets.set(path, img);
                this.lastUsed.set(path, Date.now());
                
                // Track original dimensions for scaling constraints
                this.imageDimensions.set(path, {
                    originalWidth: img.naturalWidth,
                    originalHeight: img.naturalHeight,
                    loadedAt: Date.now()
                });
                
                // Calculate safe maximum scaling (prevent upscaling beyond original)
                this.calculateScalingConstraints(path, img);
                
                this.loadingPromises.delete(path);
                this.assetsLoaded++;
                this.notifyProgress();
                
                // Check memory usage after loading
                this.checkMemoryUsage();
                
                resolve(img);
            };
            
            img.onerror = (error) => {
                this.loadingPromises.delete(path);
                this.assetsLoaded++;
                this.notifyProgress();
                // Store placeholder for failed loads
                this.assets.set(path, this.placeholderImage);
                this.lastUsed.set(path, Date.now());
                reject(new Error(`Failed to load ${path}`));
            };
            
            img.src = path;
        });
        
        this.loadingPromises.set(path, loadPromise);
        return loadPromise;
    }
    
    // Enhanced getImage with memory tracking
    getImage(path) {
        // Return cached image if available
        if (this.assets.has(path)) {
            this.lastUsed.set(path, Date.now());
            return this.assets.get(path);
        }
        
        // Create a new Image object and start loading
        const img = new Image();
        
        // Set up loading
        img.onload = () => {
            this.assets.set(path, img);
            this.lastUsed.set(path, Date.now());
            
            // Track original dimensions for scaling constraints
            this.imageDimensions.set(path, {
                originalWidth: img.naturalWidth,
                originalHeight: img.naturalHeight,
                loadedAt: Date.now()
            });
            
            // Calculate safe maximum scaling (prevent upscaling beyond original)
            this.calculateScalingConstraints(path, img);
            
            this.checkMemoryUsage();
        };
        
        img.onerror = () => {
            // Keep the broken image, don't replace with placeholder
        };
        
        // Start loading
        img.src = path;
        
        // Cache the image object immediately (even while loading)
        this.assets.set(path, img);
        this.lastUsed.set(path, Date.now());
        
        return img;
    }
    
    // Check if asset is loaded
    isLoaded(path) {
        return this.assets.has(path) && this.assets.get(path) !== this.placeholderImage;
    }
    
    // Get loading progress (0-1)
    getProgress() {
        if (this.totalAssetsToLoad === 0) return 1;
        return this.assetsLoaded / this.totalAssetsToLoad;
    }
    
    // === IMAGE DIMENSION & SCALING CONSTRAINT METHODS ===
    
    // Calculate safe scaling constraints for an image to prevent quality degradation
    calculateScalingConstraints(path, img) {
        if (!img || !img.naturalWidth || !img.naturalHeight) return;
        
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        
        // Calculate maximum safe scaling factors with display size awareness
        // Consider both image size and display characteristics
        const viewportWidth = window.innerWidth;
        const displayScale = Math.min(viewportWidth / 1920, 2.5); // Cap at 2.5x for ultra-wide displays
        
        let maxScaleFactor;
        const minDimension = Math.min(originalWidth, originalHeight);
        
        // More generous scaling for larger displays, but quality-aware
        if (minDimension <= 16) {
            maxScaleFactor = Math.min(6.0 * displayScale, 8.0); // Very small sprites can scale more
        } else if (minDimension <= 32) {
            maxScaleFactor = Math.min(4.0 * displayScale, 6.0); // Small sprites get good scaling
        } else if (minDimension <= 64) {
            // This is the key case for many items - be more generous for large displays
            maxScaleFactor = Math.min(2.5 * displayScale, 4.0); // Allow up to 4x for 64px items on large displays
        } else if (minDimension <= 128) {
            maxScaleFactor = Math.min(2.0 * displayScale, 3.0); // Larger sprites still get some scaling
        } else {
            maxScaleFactor = Math.min(1.5 * displayScale, 2.0); // Very large images stay conservative
        }
        
        // Quality preference setting - allow users to push quality limits
        const qualityPreference = 'balanced'; // Could be 'performance', 'balanced', 'quality'
        if (qualityPreference === 'quality') {
            maxScaleFactor *= 1.2; // 20% more aggressive scaling for quality preference
        } else if (qualityPreference === 'performance') {
            maxScaleFactor *= 0.8; // More conservative for performance
        }
        
        this.scalingConstraints.set(path, {
            maxScaleFactor: maxScaleFactor,
            maxWidth: originalWidth * maxScaleFactor,
            maxHeight: originalHeight * maxScaleFactor,
            originalWidth: originalWidth,
            originalHeight: originalHeight,
            displayScale: displayScale,
            recommendedMinSize: Math.max(minDimension * 1.5, 48) // Recommend minimum rendered size
        });
    }
    
    // Get original dimensions of an image
    getImageDimensions(path) {
        return this.imageDimensions.get(path) || null;
    }
    
    // Get scaling constraints for an image
    getScalingConstraints(path) {
        return this.scalingConstraints.get(path) || null;
    }
    
    // Get maximum safe size for an image given desired dimensions
    getMaxSafeSize(path, desiredWidth, desiredHeight) {
        const constraints = this.scalingConstraints.get(path);
        if (!constraints) {
            // If no constraints available, return desired size
            return { width: desiredWidth, height: desiredHeight, wasConstrained: false };
        }
        
        // Check if we're pushing quality limits
        const requestedScaleX = desiredWidth / constraints.originalWidth;
        const requestedScaleY = desiredHeight / constraints.originalHeight;
        const requestedScale = Math.max(requestedScaleX, requestedScaleY);
        
        // Clamp to maximum safe dimensions
        const safeWidth = Math.min(desiredWidth, constraints.maxWidth);
        const safeHeight = Math.min(desiredHeight, constraints.maxHeight);
        
        // Quality assessment
        let qualityRating = 'excellent';
        if (requestedScale > constraints.maxScaleFactor * 0.8) {
            qualityRating = 'good';
        }
        if (requestedScale > constraints.maxScaleFactor * 0.95) {
            qualityRating = 'fair';
        }
        if (requestedScale > constraints.maxScaleFactor) {
            qualityRating = 'poor';
        }
        
        return {
            width: safeWidth,
            height: safeHeight,
            wasConstrained: safeWidth !== desiredWidth || safeHeight !== desiredHeight,
            maxScaleFactor: constraints.maxScaleFactor,
            originalWidth: constraints.originalWidth,
            originalHeight: constraints.originalHeight,
            requestedScale: requestedScale,
            qualityRating: qualityRating,
            displayScale: constraints.displayScale,
            recommendedMinSize: constraints.recommendedMinSize
        };
    }
    
    // Recalculate scaling constraints for all loaded images (useful on window resize)
    recalculateScalingConstraints() {
        for (const [path, img] of this.assets) {
            if (img && img.naturalWidth && img.naturalHeight) {
                this.calculateScalingConstraints(path, img);
            }
        }
        console.log(`🖼️ AssetManager: Recalculated scaling constraints for ${this.assets.size} images`);
    }
    
    // Get quality assessment for current display scaling
    getQualityAssessment() {
        const constraints = Array.from(this.scalingConstraints.values());
        if (constraints.length === 0) return null;
        
        const displayScale = constraints[0]?.displayScale || 1.0;
        const avgOriginalSize = constraints.reduce((sum, c) => sum + Math.min(c.originalWidth, c.originalHeight), 0) / constraints.length;
        
        let assessment = 'excellent';
        if (displayScale > 1.5 && avgOriginalSize < 64) {
            assessment = 'good';
        }
        if (displayScale > 2.0 && avgOriginalSize < 64) {
            assessment = 'fair';
        }
        if (displayScale > 2.5 && avgOriginalSize < 48) {
            assessment = 'poor';
        }
        
        return {
            overallQuality: assessment,
            displayScale: displayScale,
            averageOriginalSize: Math.round(avgOriginalSize),
            recommendation: this.getQualityRecommendation(assessment, displayScale, avgOriginalSize)
        };
    }
    
    getQualityRecommendation(assessment, displayScale, avgOriginalSize) {
        if (assessment === 'poor') {
            return 'Consider reducing browser window size for better image quality, or try reducing game scale in settings';
        } else if (assessment === 'fair') {
            return 'Image quality may be slightly degraded at this display size';
        } else if (assessment === 'good') {
            return 'Good image quality with minor scaling artifacts possible';
        } else {
            return 'Excellent image quality';
        }
    }
    
    // Check if a desired size would exceed safe scaling limits
    wouldExceedSafeScaling(path, desiredWidth, desiredHeight) {
        const constraints = this.scalingConstraints.get(path);
        if (!constraints) return false;
        
        return desiredWidth > constraints.maxWidth || desiredHeight > constraints.maxHeight;
    }
    
    // Get recommended size based on original dimensions and desired scale
    getRecommendedSize(path, scaleFactor) {
        const dimensions = this.imageDimensions.get(path);
        const constraints = this.scalingConstraints.get(path);
        
        if (!dimensions || !constraints) {
            return null;
        }
        
        // Clamp scale factor to safe maximum
        const safeScaleFactor = Math.min(scaleFactor, constraints.maxScaleFactor);
        
        return {
            width: Math.round(dimensions.originalWidth * safeScaleFactor),
            height: Math.round(dimensions.originalHeight * safeScaleFactor),
            actualScaleFactor: safeScaleFactor,
            wasScaleReduced: safeScaleFactor !== scaleFactor
        };
    }
    
    // Callback registration methods
    onTier1Ready(callback) {
        if (this.tier1Loaded) {
            callback();
        } else {
            this.onTier1ReadyCallbacks.push(callback);
        }
    }
    
    onTier2Ready(callback) {
        if (this.tier2Loaded) {
            callback();
        } else {
            this.onTier2ReadyCallbacks.push(callback);
        }
    }
    
    onTier3Ready(callback) {
        if (this.tier3Loaded) {
            callback();
        } else {
            this.onTier3ReadyCallbacks.push(callback);
        }
    }
    
    onProgress(callback) {
        this.onProgressCallbacks.push(callback);
    }
    
    onAllReady(callback) {
        if (this.tier1Loaded && this.tier2Loaded && this.tier3Loaded) {
            callback();
        } else {
            this.onAllReadyCallbacks.push(callback);
        }
    }
    
    // Notification methods
    notifyTier1Ready() {
        this.onTier1ReadyCallbacks.forEach(callback => callback());
        this.onTier1ReadyCallbacks = [];
    }
    
    notifyTier2Ready() {
        this.onTier2ReadyCallbacks.forEach(callback => callback());
        this.onTier2ReadyCallbacks = [];
    }
    
    notifyTier3Ready() {
        this.onTier3ReadyCallbacks.forEach(callback => callback());
        this.onTier3ReadyCallbacks = [];
    }
    
    notifyAllReady() {
        this.onAllReadyCallbacks.forEach(callback => callback());
        this.onAllReadyCallbacks = [];
    }
    
    notifyProgress() {
        const progress = this.getProgress();
        this.onProgressCallbacks.forEach(callback => callback(progress));
    }
    
    // Memory management
    checkMemoryUsage() {
        // Check if we're over the cache size limit
        if (this.assets.size > this.maxCacheSize) {
            this.cleanupOldAssets();
        }
    }
    
    cleanupOldAssets() {
        // Sort assets by last used time (oldest first)
        const sortedAssets = Array.from(this.lastUsed.entries())
            .sort((a, b) => a[1] - b[1]);
        
        // Remove oldest 20% of assets
        const toRemove = Math.floor(this.assets.size * 0.2);
        
        for (let i = 0; i < toRemove && i < sortedAssets.length; i++) {
            const [path] = sortedAssets[i];
            // Don't remove Tier 1 assets
            if (!this.assetManifest.tier1.includes(path)) {
                this.assets.delete(path);
                this.lastUsed.delete(path);
                console.log(`AssetManager: Cleaned up old asset ${path}`);
            }
        }
    }
    
    // Dynamic manifest management
    addToDynamicManifest(paths, tier = 3) {
        paths.forEach(path => {
            this.dynamicAssets.add(path);
            this.assetManifest[`tier${tier}`] = this.assetManifest[`tier${tier}`] || [];
            if (!this.assetManifest[`tier${tier}`].includes(path)) {
                this.assetManifest[`tier${tier}`].push(path);
            }
        });
    }
    
    // Preload specific assets with priority
    async preloadAssets(assetPaths, priority = false) {
        if (priority) {
            // Load immediately
            const loadPromises = assetPaths.map(path => this.loadAsset(path));
            await Promise.allSettled(loadPromises);
        } else {
            // Add to background loading queue
            this.loadingQueue.push(...assetPaths.filter(path => !this.assets.has(path)));
            this.processLoadingQueue();
        }
    }
    
    // Process background loading queue
    async processLoadingQueue() {
        if (this.isLoading || this.loadingQueue.length === 0) return;
        
        this.isLoading = true;
        const batch = this.loadingQueue.splice(0, 5); // Process 5 at a time
        
        try {
            await Promise.allSettled(batch.map(path => this.loadAsset(path)));
        } catch (error) {
            // Silently handle background loading errors
        }
        
        this.isLoading = false;
        
        // Continue processing if there are more assets
        if (this.loadingQueue.length > 0) {
            setTimeout(() => this.processLoadingQueue(), 100);
        }
    }
    
    // Get cache statistics
    getCacheStats() {
        const memoryEstimate = this.assets.size * 50000; // Rough estimate: 50KB per image
        
        return {
            totalCached: this.assets.size,
            currentlyLoading: this.loadingPromises.size,
            queueLength: this.loadingQueue.length,
            tier1Ready: this.tier1Loaded,
            tier2Ready: this.tier2Loaded,
            tier3Ready: this.tier3Loaded,
            progress: this.getProgress(),
            memoryEstimate: `${(memoryEstimate / 1024 / 1024).toFixed(2)} MB`,
            loadStats: {
                ...this.loadStats,
                totalTime: this.loadStartTime ? performance.now() - this.loadStartTime : 0
            },
            dynamicAssets: this.dynamicAssets.size
        };
    }
    
    // Get detailed loading statistics
    getDetailedStats() {
        return {
            ...this.getCacheStats(),
            assetsByTier: {
                tier1: this.assetManifest.tier1.length,
                tier2: this.assetManifest.tier2.length,
                tier3: this.assetManifest.tier3.length
            },
            cacheEfficiency: {
                hitRate: this.assets.size > 0 ? (this.assets.size - this.loadStats.failedLoads) / this.assets.size : 0,
                failureRate: this.loadStats.failedLoads / Math.max(this.assetsLoaded, 1)
            }
        };
    }
    
    // Asset warmup - now uses centralized asset groups
    async warmupCache(gameLevel = 1) {
        const assetsToWarmup = commonAssets.frequent;
        
        // Add level-specific assets
        if (gameLevel > 5) {
            assetsToWarmup.push(...levelAssets.late);
        }
        
        await this.preloadAssets(assetsToWarmup, true);
    }
    
    // Clear cache (for memory management)
    clearCache() {
        this.assets.clear();
        this.loadingPromises.clear();
        this.tier1Loaded = false;
        this.tier2Loaded = false;
        this.tier3Loaded = false;
        this.assetsLoaded = 0;
    }
    
    // Performance monitoring UI (for debugging)
    createPerformanceMonitor() {
        const monitor = document.createElement('div');
        monitor.id = 'asset-performance-monitor';
        monitor.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 5px;
            z-index: 10000;
            display: none;
            min-width: 300px;
        `;
        
        document.body.appendChild(monitor);
        
        // Update monitor every 2 seconds
        setInterval(() => {
            if (monitor.style.display !== 'none') {
                this.updatePerformanceMonitor(monitor);
            }
        }, 2000);
        
        return monitor;
    }
    
    updatePerformanceMonitor(monitor) {
        const stats = this.getDetailedStats();
        
        monitor.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Asset Manager Stats</div>
            <div>Cache: ${stats.totalCached} assets (${stats.memoryEstimate})</div>
            <div>Loading: ${stats.currentlyLoading} | Queue: ${stats.queueLength}</div>
            <div>Tier 1: ${stats.tier1Ready ? '✓' : '⏳'} | Tier 2: ${stats.tier2Ready ? '✓' : '⏳'} | Tier 3: ${stats.tier3Ready ? '✓' : '⏳'}</div>
            <div>Progress: ${(stats.progress * 100).toFixed(1)}%</div>
            <div>Load Time: T1:${stats.loadStats.tier1Time.toFixed(0)}ms T2:${stats.loadStats.tier2Time.toFixed(0)}ms T3:${stats.loadStats.tier3Time.toFixed(0)}ms</div>
            <div>Failures: ${stats.loadStats.failedLoads} | Retries: ${stats.loadStats.retryAttempts}</div>
            <div>Hit Rate: ${(stats.cacheEfficiency.hitRate * 100).toFixed(1)}%</div>
            <div>Dynamic: ${stats.dynamicAssets}</div>
        `;
    }
    
    // Toggle performance monitor visibility
    togglePerformanceMonitor() {
        let monitor = document.getElementById('asset-performance-monitor');
        if (!monitor) {
            monitor = this.createPerformanceMonitor();
        }
        
        monitor.style.display = monitor.style.display === 'none' ? 'block' : 'none';
    }
    
    // Audio asset management methods
    async loadAudioAsset(path, tier = 3) {
        // If already loaded, update last used and return cached version
        if (this.audioAssets.has(path)) {
            this.lastUsed.set(path, Date.now());
            return this.audioAssets.get(path);
        }
        
        // If already loading, return existing promise
        if (this.loadingPromises.has(path)) {
            return this.loadingPromises.get(path);
        }
        
        // Create loading promise for audio
        const loadPromise = new Promise((resolve, reject) => {
            const audio = new Audio();
            
            audio.oncanplaythrough = () => {
                this.audioAssets.set(path, audio);
                this.lastUsed.set(path, Date.now());
                this.loadingPromises.delete(path);
                this.assetsLoaded++;
                this.notifyProgress();
                resolve(audio);
            };
            
            audio.onerror = (error) => {
                this.loadingPromises.delete(path);
                this.assetsLoaded++;
                this.notifyProgress();
                reject(new Error(`Failed to load audio ${path}`));
            };
            
            // Set source to start loading
            audio.src = path;
            audio.load();
        });
        
        this.loadingPromises.set(path, loadPromise);
        return loadPromise;
    }
    
    // Get audio asset (with fallback creation if not cached)
    getAudio(path) {
        // Return cached audio if available
        if (this.audioAssets.has(path)) {
            this.lastUsed.set(path, Date.now());
            return this.audioAssets.get(path);
        }
        
        // Create a new Audio object and start loading
        const audio = new Audio();
        
        // Set up loading
        audio.oncanplaythrough = () => {
            this.audioAssets.set(path, audio);
            this.lastUsed.set(path, Date.now());
        };
        
        audio.onerror = () => {
            // Silently handle audio loading errors
        };
        
        // Start loading
        audio.src = path;
        audio.load();
        
        // Cache the audio object immediately (even while loading)
        this.audioAssets.set(path, audio);
        this.lastUsed.set(path, Date.now());
        
        return audio;
    }
    
    // Check if audio asset is loaded and ready to play
    isAudioLoaded(path) {
        const audio = this.audioAssets.get(path);
        return audio && audio.readyState >= 3; // HAVE_FUTURE_DATA or better
    }
    
    // Get all audio assets for a specific category
    getAudioByCategory(category) {
        const audioCategory = assetRegistry.audio[category];
        if (!audioCategory) return null;
        
        return this.getAudio(audioCategory);
    }
    
    // Preload audio assets with retry logic
    async preloadAudioAssets(audioPaths, priority = false) {
        if (priority) {
            // Load immediately
            const loadPromises = audioPaths.map(path => this.loadAudioAssetWithRetry(path));
            await Promise.allSettled(loadPromises);
        } else {
            // Add to background loading queue
            this.loadingQueue.push(...audioPaths.filter(path => !this.audioAssets.has(path)));
            this.processLoadingQueue();
        }
    }
    
    // Audio asset loading with retry logic
    async loadAudioAssetWithRetry(path, attempt = 1) {
        try {
            return await this.loadAudioAsset(path);
        } catch (error) {
            if (attempt < this.maxRetries) {
                this.loadStats.retryAttempts++;
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                return this.loadAudioAssetWithRetry(path, attempt + 1);
            } else {
                this.loadStats.failedLoads++;
                throw error;
            }
        }
    }
    
    // Initialize audio system with AssetManager integration
    async initializeAudioSystem() {
        if (this.audioInitialized || this.audioInitAttempted) return;
        this.audioInitAttempted = true;
        
        // Get essential audio assets from registry
        const essentialAudio = [
            assetRegistry.audio.background,
            assetRegistry.audio.voice,
            assetRegistry.audio.uff,
            assetRegistry.audio.total,
            assetRegistry.audio.fireballimpact
        ];
        
        try {
            // Preload essential audio
            await this.preloadAudioAssets(essentialAudio, true);
            
            // Set up background music properties
            const backgroundMusic = this.getAudio(assetRegistry.audio.background);
            if (backgroundMusic) {
                backgroundMusic.loop = true;
                backgroundMusic.volume = gameConfig.audio.volumes.background;
                
                // Try to start background music immediately
                backgroundMusic.play().catch(e => {
                    // Background music autoplay blocked, will start on user interaction
                });
            }
            
            this.audioInitialized = true;
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // Enhanced cache stats including audio
    getCacheStats() {
        const memoryEstimate = (this.assets.size * 50000) + (this.audioAssets.size * 100000); // Rough estimates
        
        return {
            totalCached: this.assets.size,
            audioCached: this.audioAssets.size,
            currentlyLoading: this.loadingPromises.size,
            queueLength: this.loadingQueue.length,
            tier1Ready: this.tier1Loaded,
            tier2Ready: this.tier2Loaded,
            tier3Ready: this.tier3Loaded,
            audioInitialized: this.audioInitialized,
            progress: this.getProgress(),
            memoryEstimate: `${(memoryEstimate / 1024 / 1024).toFixed(2)} MB`,
            loadStats: {
                ...this.loadStats,
                totalTime: this.loadStartTime ? performance.now() - this.loadStartTime : 0
            },
            dynamicAssets: this.dynamicAssets.size
        };
    }
}

// Create singleton instance
export const assetManager = new AssetManager(); 