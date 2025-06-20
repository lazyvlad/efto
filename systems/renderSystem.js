import { gameConfig } from '../config/gameConfig.js';

export function drawSettings(ctx, canvas, gameState) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Settings panel - made larger to fit all content
    const panelWidth = 800;
    const panelHeight = 700;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME GUIDE', canvas.width/2, panelY + 40);
    
    // Instructions (different for in-game vs menu)
    ctx.fillStyle = '#CCC';
    ctx.font = '14px Arial';
    if (gameState.gameRunning) {
        ctx.fillText('Press TAB or I to toggle • ESC to close', canvas.width/2, panelY + 65);
    } else {
        ctx.fillText('Press ESC to return to menu', canvas.width/2, panelY + 65);
    }
    
    // Create two columns
    const leftColumnX = panelX + 30;
    const rightColumnX = panelX + 420;
    let leftY = panelY + 90;
    let rightY = panelY + 90;
    
    ctx.textAlign = 'left';
    
    // LEFT COLUMN - ITEMS
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('📦 COLLECTIBLE ITEMS', leftColumnX, leftY);
    leftY += 25;
    
    // Regular Items Section (4 points)
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('REGULAR ITEMS (4 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Rings, Gold', leftColumnX + 15, leftY);
    leftY += 20;
    
    // Epic Items Section (1-3 points)
    ctx.fillStyle = '#9932CC';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('EPIC ITEMS (1-3 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Ashjrethul, Maladath, Ashkandi', leftColumnX + 15, leftY);
    ctx.fillText('• Brutality Blade', leftColumnX + 15, leftY + 12);
    leftY += 32;
    
    // Special Items Section (4 points)
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('SPECIAL ITEMS (4 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Crulshorukh, Cloak, Onslaught', leftColumnX + 15, leftY);
    leftY += 20;
    
    // Legendary Items Section (5 points)
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('LEGENDARY ITEMS (5 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Tunder (very rare)', leftColumnX + 15, leftY);
    leftY += 20;
    
    // Zee Zgnan Items Section (15 points)
    ctx.fillStyle = '#FF0080';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('ZEE ZGNAN ITEMS (15 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#FF0080';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('⚡ ULTRA RARE - ONCE PER GAME! ⚡', leftColumnX + 15, leftY);
    leftY += 15;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Zee Zgnan Tigar', leftColumnX + 15, leftY);
    leftY += 25;
    
    // Tier Set Items Section (6 points + WIN CONDITION)
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('TIER SET ITEMS (6 points):', leftColumnX, leftY);
    leftY += 18;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('🏆 COLLECT ALL 8 TO WIN! 🏆', leftColumnX + 15, leftY);
    leftY += 15;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Dragonstalker Set (8 pieces)', leftColumnX + 15, leftY);
    ctx.fillText('• Missing ANY piece = Game Over!', leftColumnX + 15, leftY + 12);
    
    // RIGHT COLUMN - POWER-UPS & PROJECTILES
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('⚡ POWER-UPS & PROJECTILES', rightColumnX, rightY);
    rightY += 25;
    
    // Power-ups Section
    ctx.fillStyle = '#4169E1';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('HELPFUL POWER-UPS:', rightColumnX, rightY);
    rightY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('🔵 Mana Potion - Time Slow 50% (10s)', rightColumnX + 15, rightY);
    ctx.fillText('💚 Health Potion - Heals +20 HP', rightColumnX + 15, rightY + 12);
    ctx.fillText('⚗️ Time Cutter - Speed Cut -30%', rightColumnX + 15, rightY + 24);
    ctx.fillText('   (Permanent, max 2 per game)', rightColumnX + 25, rightY + 36);
    rightY += 55;
    
    // Beneficial Projectiles Section
    ctx.fillStyle = '#87CEEB';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('BENEFICIAL PROJECTILES:', rightColumnX, rightY);
    rightY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('⚡ Speed Boost - Increases speed', rightColumnX + 15, rightY);
    ctx.fillText('   +10%, +20%, or +30%', rightColumnX + 25, rightY + 12);
    ctx.fillText('🛡️ Power Word Shield - Protection', rightColumnX + 15, rightY + 24);
    ctx.fillText('   Blocks ALL damage (3-10s)', rightColumnX + 25, rightY + 36);
    ctx.fillText('❄️ Frost Nova - Time Freeze', rightColumnX + 15, rightY + 48);
    ctx.fillText('   Freezes all items (1-5s)', rightColumnX + 25, rightY + 60);
    rightY += 80;
    
    // Harmful Projectiles Section
    ctx.fillStyle = '#FF4500';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('HARMFUL PROJECTILES:', rightColumnX, rightY);
    rightY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('💥 Fireball - Deals 5 HP damage', rightColumnX + 15, rightY);
    ctx.fillText('❄️ Frostbolt - Deals 10 HP damage', rightColumnX + 15, rightY + 12);
    rightY += 35;
    
    // Game Mechanics Section
    ctx.fillStyle = '#FFA500';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('GAME MECHANICS:', rightColumnX, rightY);
    rightY += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '12px Arial';
    ctx.fillText('• Missing items = -1 HP', rightColumnX + 15, rightY);
    ctx.fillText('• Shield blocks ALL damage', rightColumnX + 15, rightY + 12);
    ctx.fillText('• Speed increases with level', rightColumnX + 15, rightY + 24);
    ctx.fillText('• Time effects stack', rightColumnX + 15, rightY + 36);
    
    // Back to Menu button (only when not in game)
    if (!gameState.gameRunning) {
        const buttonY = panelY + panelHeight - 50;
        const buttonWidth = 150;
        const buttonHeight = 35;
        const buttonX = panelX + (panelWidth - buttonWidth) / 2;
        
        // Button background
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        ctx.strokeStyle = '#26d0ce';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Back to Menu', buttonX + buttonWidth/2, buttonY + 22);
        
        // Store button coordinates for click detection
        gameState.menuButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    } else {
        gameState.menuButtonBounds = null;
    }
    
    ctx.textAlign = 'left';
}

export function drawPauseMenu(ctx, canvas, gameState) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pause menu panel
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width/2, panelY + 60);
    
    // Instructions
    ctx.fillStyle = '#CCC';
    ctx.font = '18px Arial';
    ctx.fillText('Game is paused', canvas.width/2, panelY + 100);
    ctx.font = '16px Arial';
    ctx.fillText('Press ESC or click Continue to resume', canvas.width/2, panelY + 125);
    
    // Continue button
    const continueButtonWidth = 150;
    const continueButtonHeight = 45;
    const continueButtonX = panelX + (panelWidth / 2) - continueButtonWidth - 10;
    const continueButtonY = panelY + 180;
    
    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(continueButtonX, continueButtonY, continueButtonWidth, continueButtonHeight);
    ctx.strokeStyle = '#26d0ce';
    ctx.lineWidth = 2;
    ctx.strokeRect(continueButtonX, continueButtonY, continueButtonWidth, continueButtonHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Continue', continueButtonX + continueButtonWidth/2, continueButtonY + 28);
    
    // Restart button
    const restartButtonWidth = 150;
    const restartButtonHeight = 45;
    const restartButtonX = panelX + (panelWidth / 2) + 10;
    const restartButtonY = panelY + 180;
    
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight);
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.strokeRect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Restart', restartButtonX + restartButtonWidth/2, restartButtonY + 28);
    
    // Store button coordinates for click detection
    gameState.pauseMenuBounds = {
        continue: {
            x: continueButtonX,
            y: continueButtonY,
            width: continueButtonWidth,
            height: continueButtonHeight
        },
        restart: {
            x: restartButtonX,
            y: restartButtonY,
            width: restartButtonWidth,
            height: restartButtonHeight
        }
    };
    
    ctx.textAlign = 'left';
}

export function drawUnifiedPanel(ctx, gameState, gameItems) {
    const collectedItems = gameItems.filter(item => item.collected > 0 && item.type !== "tier_set"); // Exclude tier set items
    
    // Panel positioning
    const startX = 20;
    const startY = 20;
    const panelWidth = 280;
    const lineHeight = 18;
    const maxVisibleItems = 12; // Reduced to fit header info
    
    // Calculate panel height including header
    const headerHeight = 100; // Increased to fit player name
    const visibleItems = Math.min(collectedItems.length, maxVisibleItems);
    const collectionsHeight = collectedItems.length > 0 ? (visibleItems * lineHeight + 35) : 0; // +35 for "ITEMS COLLECTED:" title + bottom padding
    const panelHeight = headerHeight + collectionsHeight;
    
    // Background for unified panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(startX - 10, startY - 10, panelWidth, panelHeight);
    
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 10, startY - 10, panelWidth, panelHeight);
    
    // Player name - at the top
    ctx.fillStyle = '#4ECDC4';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Player: ${gameState.playerName}`, startX, startY + 20);
    
    // Score display - large and prominent
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${gameState.score}`, startX, startY + 55);
    
    // Level display - below score
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Level ${gameState.currentLevel}`, startX, startY + 75);
    
    // Items count - below level
    ctx.fillStyle = '#CCC';
    ctx.font = '12px Arial';
    ctx.fillText(`${gameState.perfectCollections} items`, startX, startY + 90);
    
    // Tier Set Progress - special highlight
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // Check for Zee Zgnan Tigar victory
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    if (uniquePiecesCollected > 0 || gameState.tierSetMissed > 0 || zeeZgnanCollected) {
        if (gameState.gameWon) {
            if (zeeZgnanCollected) {
                ctx.fillStyle = '#FF69B4';
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`Zee Zgnan Victory! 🎯`, startX + 90, startY + 90);
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 12px Arial';
                ctx.fillText(`Dragonstalker: ${uniquePiecesCollected}/8 👑`, startX + 90, startY + 90);
            }
        } else if (gameState.gameUnwinnable) {
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`Dragonstalker: ${uniquePiecesCollected}/8 ❌`, startX + 90, startY + 90);
        } else {
            ctx.fillStyle = '#00FFFF';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`Dragonstalker: ${uniquePiecesCollected}/8 🏆`, startX + 90, startY + 90);
        }
    }
    
    // Collections section (if any items collected)
    if (collectedItems.length > 0) {
        let yOffset = headerHeight + 15;
        
        // Collections title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ITEMS COLLECTED:', startX, startY + yOffset);
        yOffset += 20;
        
        // Draw collection items (excluding tier set items)
        ctx.font = '13px Arial';
        
        collectedItems.slice(0, maxVisibleItems).forEach(item => {
            const totalPoints = item.collected * item.value;
            
            // Color code by type
            let color = '#FFFFFF'; // default white
            if (item.type === 'regular') {
                color = '#00FF00'; // green
            } else if (item.type === 'epic') {
                color = '#9932CC'; // purple
            } else if (item.type === 'special') {
                color = '#FF69B4'; // hot pink
            } else if (item.type === 'legendary') {
                color = '#FFD700'; // gold
            } else if (item.type === 'zee_zgnan') {
                color = '#FF0080'; // deep pink/magenta
            }
            
            ctx.fillStyle = color;
            ctx.fillText(`${item.name}: ${item.collected} (${totalPoints}pts)`, startX, startY + yOffset);
            yOffset += lineHeight;
        });
        
        // Show "..." if there are more items
        if (collectedItems.length > maxVisibleItems) {
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText('...', startX, startY + yOffset);
        }
    }
}

export function drawDragonstalkerProgress(ctx, canvas, gameState, gameItems) {
    // Get all Dragonstalker items
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    
    // Calculate actual unique pieces collected
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // Only show if at least one piece is collected or missed
    if (uniquePiecesCollected === 0 && gameState.tierSetMissed === 0) return;
    
    // Panel positioning - top right area (made wider to fit item names)
    const panelX = canvas.width - 380;
    const panelY = 100;
    const panelWidth = 360;
    const panelHeight = 240;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Border with special glow effect (gold if won, red if unwinnable, cyan if still possible)
    let borderColor = '#00FFFF'; // Default cyan for possible
    if (gameState.gameWon) {
        borderColor = '#FFD700'; // Gold for victory achieved
    } else if (gameState.gameUnwinnable) {
        borderColor = '#FF0000'; // Red for impossible
    }
    
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 10;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Title
    ctx.fillStyle = borderColor;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐉 DRAGONSTALKER SET 🐉', panelX + panelWidth/2, panelY + 25);
    
    // Status message
    if (gameState.gameWon) {
        // Check if victory was achieved via Zee Zgnan Tigar
        const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
        const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
        
        if (zeeZgnanCollected) {
            ctx.fillStyle = '#FF69B4';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('🎯 ZEE ZGNAN VICTORY! 🎯', panelX + panelWidth/2, panelY + 45);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('🏆 VICTORY ACHIEVED! 🏆', panelX + panelWidth/2, panelY + 45);
        }
    } else if (gameState.gameUnwinnable) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('❌ VICTORY IMPOSSIBLE ❌', panelX + panelWidth/2, panelY + 45);
    }
    
    // Progress bar
    const progressBarX = panelX + 20;
    const progressBarY = panelY + (gameState.gameUnwinnable || gameState.gameWon ? 55 : 35);
    const progressBarWidth = panelWidth - 40;
    const progressBarHeight = 20;
    
    // Progress bar background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // Progress bar fill
    if (gameState.gameWon) {
        // Full gold bar for victory
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    } else if (!gameState.gameUnwinnable) {
        // Cyan progress bar for ongoing
        const progressPercent = uniquePiecesCollected / 8;
        const progressFillWidth = progressBarWidth * progressPercent;
        
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(progressBarX, progressBarY, progressFillWidth, progressBarHeight);
    }
    
    // Progress text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${uniquePiecesCollected}/8 PIECES`, panelX + panelWidth/2, progressBarY + 15);
    
    // Item list
    let yOffset = gameState.gameUnwinnable ? 90 : 70;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    dragonstalkerItems.forEach(item => {
        const isCollected = item.collected > 0;
        const isMissed = item.missed > 0;
        const x = panelX + 15;
        const y = panelY + yOffset;
        
        // Status indicator
        if (isCollected) {
            ctx.fillStyle = '#00FF00'; // Green checkmark for collected
            ctx.fillText('✓', x, y);
        } else if (isMissed) {
            ctx.fillStyle = '#FF0000'; // Red X for missed
            ctx.fillText('✗', x, y);
        } else {
            ctx.fillStyle = '#666666'; // Gray box for not yet encountered
            ctx.fillText('□', x, y);
        }
        
        // Item name with appropriate color - use shortened names for better fit
        const shortName = item.name.replace("Dragonstalker's ", "");
        if (isCollected) {
            ctx.fillStyle = '#00FF00'; // Green for collected
        } else if (isMissed) {
            ctx.fillStyle = '#FF0000'; // Red for missed
        } else {
            ctx.fillStyle = '#AAAAAA'; // Gray for not encountered
        }
        ctx.fillText(shortName, x + 20, y);
        
        yOffset += 18;
    });
    
    // Bottom message
    if (gameState.gameWon) {
        // Check if victory was achieved via Zee Zgnan Tigar
        const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
        const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
        
        if (zeeZgnanCollected) {
            ctx.fillStyle = '#FF69B4';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎯 ZEE ZGNAN TIGAR! CONTINUE PLAYING! 🎯', panelX + panelWidth/2, panelY + panelHeight - 15);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🎉 SET COMPLETE! CONTINUE PLAYING! 🎉', panelX + panelWidth/2, panelY + panelHeight - 15);
        }
    } else if (gameState.gameUnwinnable) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀 MISSED DRAGONSTALKER PIECES 💀', panelX + panelWidth/2, panelY + panelHeight - 15);
    } else if (uniquePiecesCollected >= 6) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 ALMOST THERE! 🏆', panelX + panelWidth/2, panelY + panelHeight - 15);
    }
    
    ctx.textAlign = 'left'; // Reset text alignment
} 