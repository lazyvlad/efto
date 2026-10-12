// Money. Catching items and defeating bosses earns coins, counted in copper: 100 copper is a
// silver, 100 silver a gold. The amounts are under "coins" in config/gameConfig.js; the site
// has the same ones (config/loot.php) and decides what a game really earned.

// What catching an item of this rarity is worth
export function coinsForItem(type, rules) {
    return rules.byType[type] || 0;
}

// What defeating the boss of this zone pays
export function coinsForBoss(zone, rules) {
    return zone * rules.bossPerZone;
}

// An amount as players read it: "3g 20s 5c"
export function formatCoins(copper) {
    const amount = Math.max(0, Math.floor(copper || 0));
    const gold = Math.floor(amount / 10000);
    const silver = Math.floor(amount / 100) % 100;
    const rest = amount % 100;

    const parts = [];
    if (gold > 0) parts.push(`${gold.toLocaleString('en-US')}g`);
    if (silver > 0) parts.push(`${silver}s`);
    if (rest > 0 || parts.length === 0) parts.push(`${rest}c`);
    return parts.join(' ');
}
