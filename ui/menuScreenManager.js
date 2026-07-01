// Small screen manager for the existing menu overlay DOM.
// This is intentionally light: it centralizes visibility without changing markup.

const MENU_IDS = {
    shell: 'pauseMenu',
    content: 'pauseMenuContent',
    nameEntry: 'nameEntryContent',
    pauseGame: 'pauseGameContent',
    settings: 'settingsScreen',
    howToPlay: 'howToPlay',
    highScores: 'highScoresScreen',
    gameOver: 'gameOver',
    itemBonuses: 'itemBonusesScreen'
};

function byId(id) {
    return document.getElementById(id);
}

function setDisplay(id, display) {
    const element = byId(id);
    if (element) {
        element.style.display = display;
    }
}

function hideNestedScreens() {
    setDisplay(MENU_IDS.settings, 'none');
    setDisplay(MENU_IDS.howToPlay, 'none');
    setDisplay(MENU_IDS.highScores, 'none');
    setDisplay(MENU_IDS.gameOver, 'none');
    setDisplay(MENU_IDS.itemBonuses, 'none');
}

function showShell() {
    setDisplay(MENU_IDS.shell, 'flex');
}

export const menuScreenManager = {
    hideAll() {
        setDisplay(MENU_IDS.shell, 'none');
        hideNestedScreens();
    },

    hideShell() {
        setDisplay(MENU_IDS.shell, 'none');
    },

    showNameEntry() {
        showShell();
        hideNestedScreens();
        setDisplay(MENU_IDS.content, 'block');
        setDisplay(MENU_IDS.nameEntry, 'block');
        setDisplay(MENU_IDS.pauseGame, 'none');
    },

    showPauseMenu() {
        showShell();
        hideNestedScreens();
        setDisplay(MENU_IDS.content, 'block');
        setDisplay(MENU_IDS.nameEntry, 'none');
        setDisplay(MENU_IDS.pauseGame, 'block');
    },

    showSettings() {
        showShell();
        setDisplay(MENU_IDS.content, 'none');
        setDisplay(MENU_IDS.howToPlay, 'none');
        setDisplay(MENU_IDS.highScores, 'none');
        setDisplay(MENU_IDS.gameOver, 'none');
        setDisplay(MENU_IDS.itemBonuses, 'none');
        setDisplay(MENU_IDS.settings, 'block');
    },

    showHowToPlay() {
        showShell();
        setDisplay(MENU_IDS.content, 'none');
        setDisplay(MENU_IDS.settings, 'none');
        setDisplay(MENU_IDS.highScores, 'none');
        setDisplay(MENU_IDS.gameOver, 'none');
        setDisplay(MENU_IDS.itemBonuses, 'none');
        setDisplay(MENU_IDS.howToPlay, 'block');
    },

    showHighScores({ fromGameOver = false } = {}) {
        showShell();
        setDisplay(MENU_IDS.content, 'none');
        setDisplay(MENU_IDS.settings, 'none');
        setDisplay(MENU_IDS.howToPlay, 'none');
        setDisplay(MENU_IDS.gameOver, fromGameOver ? 'none' : 'none');
        setDisplay(MENU_IDS.itemBonuses, 'none');
        setDisplay(MENU_IDS.highScores, 'block');
    },

    showGameOver() {
        showShell();
        setDisplay(MENU_IDS.content, 'none');
        setDisplay(MENU_IDS.settings, 'none');
        setDisplay(MENU_IDS.howToPlay, 'none');
        setDisplay(MENU_IDS.highScores, 'none');
        setDisplay(MENU_IDS.itemBonuses, 'none');
        setDisplay(MENU_IDS.gameOver, 'block');
    },

    showItemBonuses() {
        showShell();
        setDisplay(MENU_IDS.content, 'none');
        setDisplay(MENU_IDS.settings, 'none');
        setDisplay(MENU_IDS.howToPlay, 'none');
        setDisplay(MENU_IDS.highScores, 'none');
        setDisplay(MENU_IDS.gameOver, 'none');
        setDisplay(MENU_IDS.itemBonuses, 'block');
    },

    backToPauseMenu() {
        hideNestedScreens();
        setDisplay(MENU_IDS.content, 'block');
        setDisplay(MENU_IDS.nameEntry, 'none');
        setDisplay(MENU_IDS.pauseGame, 'block');
    },

    backToGameOver() {
        setDisplay(MENU_IDS.highScores, 'none');
        setDisplay(MENU_IDS.gameOver, 'block');
    },

    hideSettings() {
        setDisplay(MENU_IDS.settings, 'none');
    },

    hideHowToPlay() {
        setDisplay(MENU_IDS.howToPlay, 'none');
    },

    hideHighScores() {
        setDisplay(MENU_IDS.highScores, 'none');
    },

    setMenuButtonsForGameProgress(gameInProgress) {
        setDisplay('startGameBtn', gameInProgress ? 'none' : 'inline-flex');
        setDisplay('continueGameBtn', gameInProgress ? 'inline-flex' : 'none');
        setDisplay('restartGameBtn', gameInProgress ? 'inline-flex' : 'none');
    }
};
