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
            ctx.fillText('• Dragonstalker Set (10 pieces)', leftColumnX + 15, leftY);
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
    
    // Back/Close button - always show in settings
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
    
    // Button text - different text based on game state
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    if (gameState.gameRunning) {
        ctx.fillText('Close Settings', buttonX + buttonWidth/2, buttonY + 22);
    } else {
        ctx.fillText('Back to Menu', buttonX + buttonWidth/2, buttonY + 22);
    }
    
    // Store button coordinates for click detection
    gameState.menuButtonBounds = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight
    };
    
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

// Canvas panel functions removed - now using DOM-based panels only

// Canvas Dragonstalker progress panel removed - integrated into DOM panel 