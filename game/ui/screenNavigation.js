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

// The short names of the tabs, for a phone
const TAB_SHORT = {
    howToPlay: 'How to play',
    itemBonuses: 'Loot',
    highScores: 'Scores',
    settings: 'Settings'
};

// The bar along the top of these screens, the same as the hunter's window has (game-window.css):
// Back top left, Close top right, the four screens as joined tabs under it (the one shown in
// blue). The end of a game has a top row of its own and none of this.
function createNavigationElement(screenKey) {
    const config = SCREEN_CONFIG[screenKey];
    const nav = document.createElement('header');
    nav.className = 'window-bar screen-window-bar';
    nav.dataset.screenNavigation = screenKey;

    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'game-btn window-bar-back';
    backButton.dataset.screenNavBack = screenKey;
    backButton.title = 'Back to where you were';
    const backText = document.createElement('span');
    backText.textContent = '\u2039 Back';
    const where = document.createElement('span');
    where.className = 'window-bar-where';
    where.dataset.screenNavWhere = '';
    backButton.append(backText, where);
    backButton.addEventListener('click', () => navigationCallbacks.onBack(screenKey));

    const who = document.createElement('div');
    who.className = 'window-bar-who';
    const kicker = document.createElement('p');
    kicker.className = 'window-label';
    kicker.dataset.screenNavKicker = '';
    const title = document.createElement('h2');
    title.textContent = 'I N P U T';
    who.append(kicker, title);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'game-btn window-bar-close';
    closeButton.dataset.screenNavClose = screenKey;
    closeButton.textContent = 'Close \u00d7';
    closeButton.setAttribute('aria-label', `Close ${config.title}`);
    closeButton.title = 'Close and carry on';
    closeButton.addEventListener('click', () => navigationCallbacks.onClose(screenKey));

    const tabs = document.createElement('nav');
    tabs.className = 'joined-buttons window-bar-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Screens');

    TABS.forEach(option => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = option === screenKey ? 'game-btn is-on screen-nav-tab' : 'game-btn screen-nav-tab';
        tab.dataset.screenNavTarget = option;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(option === screenKey));
        const long = document.createElement('span');
        long.className = 'tab-long';
        long.textContent = TAB_LABELS[option];
        const short = document.createElement('span');
        short.className = 'tab-short';
        short.textContent = TAB_SHORT[option];
        tab.append(long, short);
        if (option !== screenKey) tab.addEventListener('click', () => navigationCallbacks.onNavigate(option, screenKey));
        tabs.append(tab);
    });

    nav.append(backButton, who, closeButton, tabs);
    return nav;
}

// A screen as a window: its bar on top, and everything it had under it, in a part of its own
// that scrolls. Built once; what was in the screen keeps its ids and what listens to it.
function ensureNavigation(screenKey) {
    // The end of a game has its own top row
    if (!TABS.includes(screenKey)) {
        return null;
    }

    const screen = byId(SCREEN_CONFIG[screenKey].containerId);
    if (!screen) {
        return null;
    }

    const existing = screen.querySelector(`[data-screen-navigation="${screenKey}"]`);
    if (existing) {
        return existing;
    }

    const nav = createNavigationElement(screenKey);
    const frame = document.createElement('div');
    frame.className = 'window-frame';
    const scroll = document.createElement('div');
    scroll.className = 'window-scroll';
    scroll.append(...screen.childNodes);
    frame.append(nav, scroll);
    screen.append(frame);
    screen.classList.add('has-window-frame');
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

// Say under Back where it goes ("to the pause menu"), and above the name what the game is doing
export function updateScreenNavigation(screenKey, { backLabel = '' } = {}) {
    const nav = ensureNavigation(screenKey);
    if (!nav) {
        return;
    }

    const where = nav.querySelector('[data-screen-nav-where]');
    if (where) {
        where.textContent = backLabel === 'Back' ? '' : backLabel;
    }
    const kicker = nav.querySelector('[data-screen-nav-kicker]');
    if (kicker) {
        kicker.textContent = backLabel === 'to the map' ? 'Before a game' : (backLabel === 'to the end of the game' ? 'The game is over' : 'Paused');
    }
}

export function getScreenLabel(screenKey) {
    return SCREEN_LABELS[screenKey] || SCREEN_LABELS.menu;
}
