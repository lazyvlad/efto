import { gameConfig } from '../config/gameConfig.js';
import { renderCanvasHud, hideMessagesAboveField } from './hudNotificationSystem.js';
import { drawBoss } from './bossSystem.js';
import { planHud, applyHud } from '../ui/hudLayout.js';

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
    renderBulletTimeEffects,
    alpha = 1
}) {
    // Ensure consistent image smoothing quality for rotation
    if (canvas.setupImageSmoothing) {
        canvas.setupImageSmoothing();
    }
    
    // Clear canvas using logical dimensions
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    // Messages shown above the play field belong to a game in progress
    if (!gameState.gameRunning) hideMessagesAboveField();
    
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
            renderBulletTimeEffects,
            alpha
        });
    } else if (gameState.gameWon) {
        renderVictory(ctx, canvas, gameState);
    } else if (gameState.health <= 0) {
        renderGameOver(ctx, canvas, gameState);
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
    renderBulletTimeEffects,
    alpha = 1
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
    // The simulation runs at a fixed 60 steps per second, so draw everything at a position
    // interpolated between its last two steps to stay smooth at any display refresh rate.
    const drawEntity = (entity, ...drawArgs) => {
        if (alpha >= 1 || entity.prevX === undefined) {
            entity.draw(ctx, ...drawArgs);
            return;
        }
        const { x, y } = entity;
        entity.x = entity.prevX + (x - entity.prevX) * alpha;
        entity.y = entity.prevY + (y - entity.prevY) * alpha;
        entity.draw(ctx, ...drawArgs);
        entity.x = x;
        entity.y = y;
    };
    
    drawBoss(ctx, canvas, alpha);
    particles.forEach(particle => drawEntity(particle));
    fallingItems.forEach(item => drawEntity(item, gameConfig));
    fireballs.forEach(projectile => drawEntity(projectile));
    powerUps.forEach(powerUp => drawEntity(powerUp));
    window.arrows.forEach(arrow => drawEntity(arrow));
    combatTexts.forEach(text => drawEntity(text));
    player.draw(ctx, gameState.shieldActive ? Math.max(1, gameState.shieldTimer) : 0, gameState.health / gameState.maxHealth);
    
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
            
            // Never drawn larger than its own size, except the phone's field, which is made as
            // wide as the screen (displayScale, from ResponsiveScaler.getCanvasDimensions)
            scale = Math.min(scale, deviceCanvasDimensions.displayScale || 1.0);
            
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
            
        } else {
            // Desktop/landscape: Standard centering
            leftOffset = (viewportWidth - displayWidth) / 2;
            topOffset = (viewportHeight - displayHeight) / 2;
        }

        // The interface is scaled to the field and the spell buttons found a place off it
        // where there is one (ui/hudLayout.js). Under the field, the field moves up for them.
        const viewport = { width: viewportWidth, height: viewportHeight };
        const hud = isMobilePortrait ? null
            : planHud(viewport, { left: leftOffset, top: topOffset, width: displayWidth, height: displayHeight });
        if (hud) {
            if (hud.shrink > 0) {
                // No room to spare for the buttons: the field gives up their height
                displayHeight -= hud.shrink;
                displayWidth = displayHeight * targetAspectRatio;
                scale = displayHeight / targetHeight;
                leftOffset = (viewportWidth - displayWidth) / 2;
                canvas.style.width = displayWidth + 'px';
                canvas.style.height = displayHeight + 'px';
            }
            topOffset -= hud.lift;
        }
        applyHud(hud, viewport, { left: leftOffset, top: topOffset, width: displayWidth, height: displayHeight });
        
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
    
    
    // Refresh panel styles when canvas dimensions change
    // Small delay to ensure canvas properties are fully set
    setTimeout(() => {
        refreshPanelStyles();
    }, 50);
}