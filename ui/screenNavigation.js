const SCREEN_CONFIG = {
    settings: {
        containerId: 'settingsScreen',
        title: 'Game Settings',
        options: ['howToPlay', 'highScores']
    },
    howToPlay: {
        containerId: 'howToPlay',
        title: 'How to Play',
        options: ['settings', 'highScores']
    },
    highScores: {
        containerId: 'highScoresScreen',
        title: 'High Scores',
        options: ['settings', 'howToPlay']
    },
    gameOver: {
        containerId: 'gameOver',
        title: 'Game Over',
        options: ['highScores', 'settings', 'howToPlay']
    }
};

const SCREEN_LABELS = {
    settings: 'Settings',
    howToPlay: 'How to Play',
    highScores: 'High Scores',
    gameOver: 'Game Over',
    menu: 'Main Menu',
    pause: 'Pause Menu',
    game: 'Game'
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

    const jumpWrapper = document.createElement('label');
    jumpWrapper.className = 'screen-nav-jump';
    jumpWrapper.textContent = 'Jump to';

    const jumpSelect = document.createElement('select');
    jumpSelect.dataset.screenNavJump = screenKey;
    jumpSelect.innerHTML = [
        '<option value="">Choose screen</option>',
        ...config.options.map(option => `<option value="${option}">${SCREEN_LABELS[option]}</option>`)
    ].join('');
    jumpSelect.addEventListener('change', function() {
        if (!this.value) {
            return;
        }

        const target = this.value;
        this.value = '';
        navigationCallbacks.onNavigate(target, screenKey);
    });

    jumpWrapper.appendChild(jumpSelect);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'screen-nav-close';
    closeButton.dataset.screenNavClose = screenKey;
    closeButton.textContent = 'X';
    closeButton.setAttribute('aria-label', `Close ${config.title}`);
    closeButton.title = 'Close and resume';
    closeButton.addEventListener('click', () => navigationCallbacks.onClose(screenKey));

    nav.append(backButton, jumpWrapper, closeButton);
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
