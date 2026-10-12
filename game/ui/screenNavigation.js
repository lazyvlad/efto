const SCREEN_CONFIG = {
    settings: {
        containerId: 'settingsScreen',
        title: 'Game Settings',
        options: ['howToPlay', 'highScores', 'itemBonuses']
    },
    howToPlay: {
        containerId: 'howToPlay',
        title: 'How to Play',
        options: ['settings', 'highScores', 'itemBonuses']
    },
    highScores: {
        containerId: 'highScoresScreen',
        title: 'High Scores',
        options: ['settings', 'howToPlay', 'itemBonuses']
    },
    gameOver: {
        containerId: 'gameOver',
        title: 'Game Over',
        options: ['highScores', 'settings', 'howToPlay']
    },
    itemBonuses: {
        containerId: 'itemBonusesScreen',
        title: 'Item Bonuses',
        options: ['settings', 'howToPlay', 'highScores']
    }
};

const SCREEN_LABELS = {
    settings: 'Settings',
    howToPlay: 'How to Play',
    highScores: 'High Scores',
    gameOver: 'Game Over',
    itemBonuses: 'Item Bonuses',
    menu: 'Main Menu',
    pause: 'Pause Menu',
    game: 'Game'
};

const SCREEN_SHORT_LABELS = {
    settings: 'Settings',
    howToPlay: 'Guide',
    highScores: 'Scores',
    gameOver: 'Over',
    itemBonuses: 'Bonuses'
};

let navigationCallbacks = {
    onBack: () => {},
    onNavigate: () => {},
    onClose: () => {}
};

function byId(id) {
    return document.getElementById(id);
}

function createNavigationElement(screenKey) {
    const config = SCREEN_CONFIG[screenKey];
    const nav = document.createElement('div');
    nav.className = 'screen-navigation';
    nav.dataset.screenNavigation = screenKey;

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'screen-nav-back';
    backButton.dataset.screenNavBack = screenKey;
    backButton.textContent = 'Back';
    backButton.addEventListener('click', () => navigationCallbacks.onBack(screenKey));

    const menuWrapper = document.createElement('div');
    menuWrapper.className = 'screen-nav-menu';
    menuWrapper.setAttribute('aria-label', 'Screen navigation');

    const menuLabel = document.createElement('span');
    menuLabel.className = 'screen-nav-menu-label';
    menuLabel.textContent = 'Go to';

    const menuActions = document.createElement('div');
    menuActions.className = 'screen-nav-menu-actions';

    config.options.forEach(option => {
        const screenButton = document.createElement('button');
        const fullLabel = SCREEN_LABELS[option];
        const shortLabel = SCREEN_SHORT_LABELS[option] || fullLabel;

        screenButton.type = 'button';
        screenButton.className = 'screen-nav-menu-button';
        screenButton.dataset.screenNavTarget = option;
        screenButton.title = fullLabel;
        screenButton.innerHTML = `<span class="screen-nav-label-full">${fullLabel}</span><span class="screen-nav-label-short">${shortLabel}</span>`;
        screenButton.addEventListener('click', () => navigationCallbacks.onNavigate(option, screenKey));
        menuActions.appendChild(screenButton);
    });

    menuWrapper.append(menuLabel, menuActions);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'screen-nav-close';
    closeButton.dataset.screenNavClose = screenKey;
    closeButton.textContent = 'X';
    closeButton.setAttribute('aria-label', `Close ${config.title}`);
    closeButton.title = 'Close and resume';
    closeButton.addEventListener('click', () => navigationCallbacks.onClose(screenKey));

    nav.append(backButton, menuWrapper, closeButton);
    return nav;
}

function getNavigationHost(screenKey) {
    const container = byId(SCREEN_CONFIG[screenKey].containerId);
    if (!container) {
        return null;
    }

    return container.querySelector('.screen-content') || container;
}

function ensureNavigation(screenKey) {
    const host = getNavigationHost(screenKey);
    if (!host) {
        return null;
    }

    const existing = host.querySelector(`.screen-navigation[data-screen-navigation="${screenKey}"]`);
    if (existing) {
        return existing;
    }

    const nav = createNavigationElement(screenKey);
    host.prepend(nav);
    return nav;
}

function hideLegacyBackButtons() {
    ['settingsBackBtn', 'backToMenuBtn2', 'highScoresBackBtn'].forEach(id => {
        const button = byId(id);
        if (button) {
            button.classList.add('legacy-screen-back');
        }
    });
}

export function initializeScreenNavigation(callbacks) {
    navigationCallbacks = {
        ...navigationCallbacks,
        ...callbacks
    };

    Object.keys(SCREEN_CONFIG).forEach(ensureNavigation);
    hideLegacyBackButtons();
}

export function updateScreenNavigation(screenKey, { backLabel = 'Back' } = {}) {
    const nav = ensureNavigation(screenKey);
    if (!nav) {
        return;
    }

    const backButton = nav.querySelector('[data-screen-nav-back]');
    if (backButton) {
        backButton.textContent = backLabel;
    }
}

export function getScreenLabel(screenKey) {
    return SCREEN_LABELS[screenKey] || SCREEN_LABELS.menu;
}
