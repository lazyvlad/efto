// Settings changed in the site's admin section, laid over the game's own.
// The site hands them over with the page as { 'bosses.health.base': 300, ... }: a path into
// gameConfig and the number to put there (config/game_settings.php on the server lists them).

/**
 * Put each value at its path. Only a number that replaces a number is taken, so nothing the
 * site sends can add to the settings or change what kind of thing one is.
 * @param {Object} config - The settings to change (gameConfig)
 * @param {Object} [changes] - Path to value
 * @returns {string[]} The paths that were changed
 */
export function applySettings(config, changes) {
    const applied = [];

    for (const [path, value] of Object.entries(changes || {})) {
        const keys = path.split('.');
        const last = keys.pop();
        const holder = keys.reduce((at, key) => (at && typeof at === 'object' ? at[key] : undefined), config);

        if (holder && typeof holder[last] === 'number' && Number.isFinite(value)) {
            holder[last] = value;
            applied.push(path);
        }
    }

    return applied;
}
