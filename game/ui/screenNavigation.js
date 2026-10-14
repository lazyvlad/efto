const SCREEN_CONFIG = {
    settings: {
        containerId: 'settingsScreen',
        title: 'Game Settings'
    },
    howToPlay: {
        containerId: 'howToPlay',
        title: 'How to Play'
    },
    highScores: {
        containerId: 'highScoresScreen',
        title: 'High Scores'
    },
    gameOver: {
        containerId: 'gameOver',
        title: 'Game Over'
    },
    itemBonuses: {
        containerId: 'itemBonusesScreen',
        title: 'Loot and Bonuses'
    }
};

const SCREEN_LABELS = {
    settings: 'Settings',
    howToPlay: 'How to Play',
    highScores: 'High Scores',
    gameOver: 'Game Over',
    itemBonuses: 'Loot & Bonuses',
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

// The four screens that are the tabs of one window, in the order the tabs are shown
const TABS = ['howToPlay', 'itemBonuses', 'highScores', 'settings'];

const TAB_LABELS = {
    howToPlay: 'How to play',
    itemBonuses: 'Loot & bonuses',
    highScores: 'High scores',
    settings: 'Settings'
};

// The bar along the top of these screens, like the top row of the inventory: the medallion,
// the four screens as joined tabs (the one shown in blue), and the ways back. The end of a
// game has a top row of its own and none of this.
function createNavigationElement(screenKey) {
    const config = SCREEN_CONFIG[screenKey];
    const nav = document.createElement('div');
    nav.className = 'screen-navigation';
    nav.dataset.screenNavigation = screenKey;

    const logo = document.createElement('img');
    logo.className = 'window-logo';
    logo.src = 'assets/ui/input-logo.webp';
    logo.alt = '';
    logo.width = 1200;
    logo.height = 891;

    const tabs = document.createElement('div');
    tabs.className = 'joined-buttons screen-nav-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Screens');

    TABS.forEach(option => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = option === screenKey ? 'game-btn is-on screen-nav-tab' : 'game-btn screen-nav-tab';
        tab.dataset.screenNavTarget = option;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(option === screenKey));
        tab.textContent = TAB_LABELS[option];
        if (option !== screenKey) tab.addEventListener('click', () => navigationCallbacks.onNavigate(option, screenKey));
        tabs.append(tab);
    });

    const side = document.createElement('div');
    side.className = 'screen-nav-side';

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'game-btn screen-nav-back';
    backButton.dataset.screenNavBack = screenKey;
    backButton.textContent = 'Back';
    backButton.addEventListener('click', () => navigationCallbacks.onBack(screenKey));

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'game-btn screen-nav-close';
    closeButton.dataset.screenNavClose = screenKey;
    closeButton.textContent = 'Close';
    closeButton.setAttribute('aria-label', `Close ${config.title}`);
    closeButton.title = 'Close and resume';
    closeButton.addEventListener('click', () => navigationCallbacks.onClose(screenKey));

    side.append(backButton, closeButton);
    nav.append(logo, tabs, side);
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
    // The end of a game has its own top row
    if (!TABS.includes(screenKey)) {
        return null;
    }

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
