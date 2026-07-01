import { gameConfig } from '../config/gameConfig.js';
import { renderCanvasHud } from './hudNotificationSystem.js';

// The drawSettings function has been removed as it's replaced by HTML+CSS guide.

export function renderFrame({
    ctx,
    canvas,
    gameState,
    responsiveScaler,
    player,
    particles,
    fallingItems,
    fireballs,
    powerUps,
    combatTexts,
    gameItems,
    gameVersion,
    updateDOMItemsPanel,
    renderBulletTimeEffects
}) {
    // Ensure consistent image smoothing quality for rotation
    if (canvas.setupImageSmoothing) {
        canvas.setupImageSmoothing();
    }
    
    // Clear canvas using logical dimensions
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    if (gameState.gameRunning) {
        renderGame({
            ctx,
            canvas,
            gameState,
            responsiveScaler,
            player,
            particles,
            fallingItems,
            fireballs,
            powerUps,
            combatTexts,
            gameItems,
            gameVersion,
            updateDOMItemsPanel,
            renderBulletTimeEffects
        });
    } else if (gameState.gameWon) {
        renderVictory(ctx, canvas, gameState);
    } else if (gameState.health <= 0) {
        renderGameOver(ctx, canvas, gameState);
    } else {
        // renderHighScores();
    }
}

function renderGame({
    ctx,
    canvas,
    gameState,
    responsiveScaler,
    player,
    particles,
    fallingItems,
    fireballs,
    powerUps,
    combatTexts,
    gameItems,
    gameVersion,
    updateDOMItemsPanel,
    renderBulletTimeEffects
}) {
    // Draw movable area border if enabled (now responsive)
    const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
    if (movableAreaConfig.enabled && movableAreaConfig.showBorder) {
        const baseMovableHeight = canvas.logicalHeight * movableAreaConfig.heightPercent;
        const dodgeExpansion = gameState.dodgeAreaExpansion || 0;
        const totalMovableHeight = baseMovableHeight + dodgeExpansion;
        
        const baseBorderY = canvas.logicalHeight - baseMovableHeight;
        const expandedBorderY = canvas.logicalHeight - totalMovableHeight;
        
        ctx.save();
        
        // Draw base movable area border (normal color)
        ctx.strokeStyle = movableAreaConfig.borderColor;
        ctx.globalAlpha = movableAreaConfig.borderOpacity;
        ctx.lineWidth = movableAreaConfig.borderWidth;
        
        ctx.beginPath();
        ctx.moveTo(0, baseBorderY);
        ctx.lineTo(canvas.logicalWidth, baseBorderY);
        ctx.stroke();
        
        // Draw dodge-expanded area if present
        if (dodgeExpansion > 0) {
            // Fill the dodge area with a subtle background
            ctx.fillStyle = '#00FF88';
            ctx.globalAlpha = 0.1;
            ctx.fillRect(0, expandedBorderY, canvas.logicalWidth, dodgeExpansion);
            
            // Draw dodge area border (bright green)
            ctx.strokeStyle = '#00FF88';
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = movableAreaConfig.borderWidth + 1;
            
            ctx.beginPath();
            ctx.moveTo(0, expandedBorderY);
            ctx.lineTo(canvas.logicalWidth, expandedBorderY);
            ctx.stroke();
            
            // Add dodge label
            ctx.fillStyle = '#00FF88';
            ctx.globalAlpha = 1.0;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`💨 Dodge Area: +${Math.round(dodgeExpansion)}px`, 10, expandedBorderY - 5);
        }
        
        // Draw side borders for both areas
        ctx.strokeStyle = movableAreaConfig.borderColor;
        ctx.globalAlpha = movableAreaConfig.borderOpacity;
        ctx.lineWidth = movableAreaConfig.borderWidth;
        
        ctx.beginPath();
        ctx.moveTo(0, expandedBorderY);
        ctx.lineTo(0, canvas.logicalHeight);
        ctx.moveTo(canvas.logicalWidth, expandedBorderY);
        ctx.lineTo(canvas.logicalWidth, canvas.logicalHeight);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render game elements
    particles.forEach(particle => particle.draw(ctx));
    fallingItems.forEach(item => item.draw(ctx, gameConfig));
    fireballs.forEach(projectile => projectile.draw(ctx));
    powerUps.forEach(powerUp => powerUp.draw(ctx));
    window.arrows.forEach(arrow => arrow.draw(ctx));
    combatTexts.forEach(text => text.draw(ctx));
    player.draw(ctx, gameState.shieldActive);
    
    // Update DOM-based items panel (throttled for performance)
    // Only update every 10 frames to reduce DOM manipulation overhead
    if (!gameState.domUpdateCounter) gameState.domUpdateCounter = 0;
    gameState.domUpdateCounter++;
    if (gameState.domUpdateCounter % 10 === 0) {
        updateDOMItemsPanel(gameState, gameItems);
    }
    
    renderBulletTimeEffects();
    renderCanvasHud(ctx, canvas);
    
    // Render version number in lower left corner
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`v${gameVersion}`, 10, canvas.logicalHeight - 10);
    ctx.restore();
}

function renderGameOver(ctx, canvas, gameState) {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.logicalWidth/2, canvas.logicalHeight/2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.logicalWidth/2, canvas.logicalHeight/2 + 20);
}

function renderVictory(ctx, canvas, gameState) {
    ctx.fillStyle = 'gold';
    ctx.textAlign = 'center';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.logicalWidth/2, canvas.logicalHeight/2 + 20);
}

export function setupHighDPICanvas({ canvas, ctx, responsiveScaler, refreshPanelStyles }) {
    // Get current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get device-specific canvas dimensions from ResponsiveScaler
    const deviceCanvasDimensions = responsiveScaler.getCanvasDimensionsForDevice();
    const playableArea = responsiveScaler.getPlayableAreaDimensions();
    
    // Select canvas dimensions based on device type
    const targetWidth = deviceCanvasDimensions.width;
    const targetHeight = deviceCanvasDimensions.height;
    const targetAspectRatio = deviceCanvasDimensions.aspectRatio;
    
    console.log(`🎮 Setting up canvas for ${responsiveScaler.deviceType}:
        Canvas: ${targetWidth}x${targetHeight} (${targetAspectRatio.toFixed(2)} aspect ratio)
        Playable Area: ${playableArea.width}x${playableArea.height}
        Viewport: ${viewportWidth}x${viewportHeight}`);
    
    // Store current device type and mode for other systems to access
    canvas.deviceType = responsiveScaler.deviceType;
    canvas.isPortraitMode = responsiveScaler.deviceType === 'mobile'; // Mobile uses portrait-style canvas
    
    // Calculate scaling to fit the canvas in the viewport while maintaining aspect ratio
    // IMPORTANT: Never exceed the target dimensions (1440x810 max)
    let displayWidth, displayHeight;
    let scaleX, scaleY, scale;
    
    if (gameConfig.canvas.scaling.enabled && gameConfig.canvas.scaling.scaleToFit) {
        // Calculate the scale needed to fit the canvas in the viewport
        scaleX = viewportWidth / targetWidth;
        scaleY = viewportHeight / targetHeight;
        
        if (gameConfig.canvas.scaling.maintainAspectRatio) {
            // Use the smaller scale to ensure the entire canvas fits
            scale = Math.min(scaleX, scaleY);
            
            // CRITICAL: Never scale above 1.0 to maintain exact target dimensions
            // This ensures we never exceed 1440x810 pixels
            scale = Math.min(scale, 1.0);
            
            displayWidth = targetWidth * scale;
            displayHeight = targetHeight * scale;
        } else {
            // Stretch to fill (not recommended for games)
            scale = Math.min(scaleX, scaleY, 1.0);
            displayWidth = Math.min(viewportWidth, targetWidth);
            displayHeight = Math.min(viewportHeight, targetHeight);
        }
    } else {
        // Use fixed dimensions without scaling
        displayWidth = targetWidth;
        displayHeight = targetHeight;
        scale = 1;
    }
    
    // Set up high-DPI support
    let pixelRatio = 1;
    if (gameConfig.canvas.highDPI.enabled) {
        pixelRatio = gameConfig.canvas.highDPI.autoDetect ? 
            (window.devicePixelRatio || 1) : 1;
        
        // Limit pixel ratio to prevent performance issues
        if (gameConfig.canvas.highDPI.maxPixelRatio) {
            pixelRatio = Math.min(pixelRatio, gameConfig.canvas.highDPI.maxPixelRatio);
        }
    }
    
    // Set canvas dimensions
    // Internal resolution (what the game logic sees)
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Display size (how big it appears on screen)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Handle positioning - mobile-optimized for touch devices
    if (gameConfig.canvas.scaling.centerCanvas) {
        const deviceDimensions = responsiveScaler.getCanvasDimensionsForDevice();
        const isMobilePortrait = responsiveScaler.deviceType === 'mobile' && 
                                responsiveScaler.orientation === 'portrait' &&
                                deviceDimensions.positioning?.useCustomPositioning;
        
        let leftOffset, topOffset;
        
        if (isMobilePortrait) {
            // Mobile portrait: Horizontal center, positioned between combined panel and spell buttons
            leftOffset = deviceDimensions.positioning.centerHorizontally ? 
                (viewportWidth - displayWidth) / 2 : 0;
            
            // Calculate positioning between top panel and bottom spell buttons
            const topOffset_setting = deviceDimensions.positioning.topOffset || 90; // Below combined panel
            const bottomOffset = deviceDimensions.positioning.bottomOffset || 100; // Above spell buttons
            
            // Calculate available space for canvas
            const availableHeight = viewportHeight - topOffset_setting - bottomOffset;
            
            // Center canvas in available space or position at top offset if it doesn't fit
            if (displayHeight <= availableHeight) {
                // Canvas fits - center it in available space
                const extraSpace = availableHeight - displayHeight;
                topOffset = topOffset_setting + (extraSpace / 2);
            } else {
                // Canvas too tall - position at minimum top offset
                topOffset = topOffset_setting;
            }
            
            // Ensure we don't go above the panel or below the buttons
            topOffset = Math.max(topOffset_setting, Math.min(topOffset, viewportHeight - displayHeight - bottomOffset));
            
            console.log(`📱 Mobile Portrait Canvas Positioning:
                Canvas: ${displayWidth}x${displayHeight}
                Viewport: ${viewportWidth}x${viewportHeight}  
                Position: left=${leftOffset}px, top=${topOffset}px
                Top offset: ${topOffset_setting}px, Bottom offset: ${bottomOffset}px
                Available space: ${availableHeight}px`);
        } else {
            // Desktop/landscape: Standard centering
            leftOffset = (viewportWidth - displayWidth) / 2;
            topOffset = (viewportHeight - displayHeight) / 2;
        }
        
        canvas.style.position = 'fixed';
        canvas.style.left = leftOffset + 'px';
        canvas.style.top = topOffset + 'px';
        
        // Update CSS custom properties for letterboxing
        document.documentElement.style.setProperty('--letterbox-left', leftOffset + 'px');
        document.documentElement.style.setProperty('--letterbox-top', topOffset + 'px');
        document.documentElement.style.setProperty('--letterbox-width', displayWidth + 'px');
        document.documentElement.style.setProperty('--letterbox-height', displayHeight + 'px');
    }
    
    // Apply high-DPI scaling to canvas context
    if (pixelRatio > 1) {
        const actualWidth = canvas.width * pixelRatio;
        const actualHeight = canvas.height * pixelRatio;
        
        // Set the actual canvas size in memory
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        
        // Scale the context back down
        ctx.scale(pixelRatio, pixelRatio);
        
        // Set the display size back to what we want
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
    }
    
    // Optimize image rendering quality for rotation and scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Additional settings to prevent visual tearing during rotation
    if (ctx.textRenderingOptimizeSpeed !== undefined) {
        ctx.textRenderingOptimizeSpeed = false; // Prioritize quality over speed
    }
    
    // Store the enhanced image smoothing function for use during rendering
    canvas.setupImageSmoothing = function() {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    };
    
    // Ensure image smoothing is maintained throughout the game loop
    canvas.setupImageSmoothing();
    
    // Store important values for game logic
    canvas.dpr = pixelRatio;
    canvas.logicalWidth = targetWidth;
    canvas.logicalHeight = targetHeight;
    canvas.displayWidth = displayWidth;
    canvas.displayHeight = displayHeight;
    canvas.scale = scale;
    
    // Update body background for letterboxing
    if (gameConfig.canvas.scaling.enabled) {
        document.body.style.backgroundColor = gameConfig.canvas.scaling.letterboxColor;
    }
    
    console.log(`👑 Playable-Area-Based Canvas Setup Complete:
        Device: ${responsiveScaler.deviceType}
        Logical: ${targetWidth}x${targetHeight}
        Display: ${displayWidth}x${displayHeight} 
        Scale: ${scale.toFixed(2)}x
        DPR: ${pixelRatio}
        Viewport: ${viewportWidth}x${viewportHeight}
        Playable Area: ${playableArea.width}x${playableArea.height}
        Item Scale: ${responsiveScaler.uniformScale.toFixed(2)}x
        
`);
    
    // Debug info for letterboxing
    if (gameConfig.canvas.scaling.showLetterboxInfo) {
        const viewportAspectRatio = viewportWidth / viewportHeight;
        console.log(`Letterbox Info:
            Viewport AR: ${viewportAspectRatio.toFixed(2)}
            Target AR: ${targetAspectRatio.toFixed(2)}
            Letterbox: ${Math.abs(viewportAspectRatio - targetAspectRatio) > 0.01 ? 'Yes' : 'No'}
            Device Type: ${responsiveScaler.deviceType}`);
    }
    
    // Refresh panel styles when canvas dimensions change
    // Small delay to ensure canvas properties are fully set
    setTimeout(() => {
        refreshPanelStyles();
    }, 50);
}