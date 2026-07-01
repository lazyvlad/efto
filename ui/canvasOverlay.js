// Canvas overlay visibility helper.

export function updateCanvasOverlayVisibility({ gameState, onGameVisible }) {
    const overlay = document.getElementById('canvasOverlay');
    const gameUI = document.getElementById('gameUI');

    if (!overlay) return;

    if (gameState.gameRunning && !gameState.showingPauseMenu) {
        overlay.style.display = 'none';
        if (gameUI) gameUI.style.display = 'block';
        if (onGameVisible) onGameVisible();
        return;
    }

    if (
        gameState.showingPauseMenu ||
        gameState.currentScreen === 'settings' ||
        gameState.currentScreen === 'howToPlay' ||
        gameState.currentScreen === 'highScores'
    ) {
        overlay.style.display = 'block';
        if (gameUI) gameUI.style.display = 'none';
        return;
    }

    overlay.style.display = 'none';
    if (gameUI) gameUI.style.display = 'none';
}
