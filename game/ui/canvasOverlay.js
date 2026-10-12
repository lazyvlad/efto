// Canvas overlay visibility helper.

// Called every frame, so only write styles that actually change.
function setDisplay(element, value) {
    if (element && element.style.display !== value) element.style.display = value;
}

export function updateCanvasOverlayVisibility({ gameState, onGameVisible }) {
    const overlay = document.getElementById('canvasOverlay');
    const gameUI = document.getElementById('gameUI');

    if (!overlay) return;

    if (gameState.gameRunning && !gameState.showingPauseMenu) {
        setDisplay(overlay, 'none');
        setDisplay(gameUI, 'block');
        if (onGameVisible) onGameVisible();
        return;
    }

    if (
        gameState.showingPauseMenu ||
        gameState.currentScreen === 'settings' ||
        gameState.currentScreen === 'howToPlay' ||
        gameState.currentScreen === 'highScores'
    ) {
        setDisplay(overlay, 'block');
        setDisplay(gameUI, 'none');
        return;
    }

    setDisplay(overlay, 'none');
    setDisplay(gameUI, 'none');
}
