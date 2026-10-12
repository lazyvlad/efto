// Rare loot and the record of the game being played.
//
// Under the site, the server decides which rare items a game contains. The game opens a record
// when it starts and asks for its rare drops one chunk of play at a time, a few seconds before
// it needs them, so the browser never holds more than the next chunk. A pickup of a rare item
// is reported with the id of the drop it came from; the server only counts drops it offered.
//
// If the server cannot be reached in time the game goes offline: rare items drop at random
// again, as they do when the game is opened on its own, and the game no longer counts (it is
// recorded as offline and stays off the leaderboard). A game that went offline stays offline.
//
// A copy of the record is kept in localStorage while the game runs, so a game that was left,
// closed or crashed part-way is still handed in the next time the game is opened.

import { siteBoot } from '../ui/accountBar.js';
import { GAME_VERSION } from '../config/gameVersion.js';

// Rarities the server decides (config/loot.php on the site has the same list)
const SERVER_TYPES = new Set(['epic', 'special', 'tier_set', 'legendary', 'zee_zgnan']);

const RECORD_PREFIX = 'input_game_record_';
const TAB_GAME_KEY = 'input_game_token';
const REQUEST_LEAD_SECONDS = 10;    // Ask for a chunk this long before it starts
const OPEN_DEADLINE_SECONDS = 10;   // Seconds of play the server has to answer when a game starts
const RETRY_MS = 3000;
const REQUEST_TIMEOUT_MS = 8000;
const SAVE_EVERY_SECONDS = 15;
// A stored record this fresh may belong to a game running in another tab
const LIVE_RECORD_MS = 60000;

let session = null;

function gamesUrl(token, action) {
    return token ? `${siteBoot.urls.games}/${token}/${action}` : siteBoot.urls.games;
}

async function post(url, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': siteBoot.csrfToken
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

function recordKey(token) {
    return `${RECORD_PREFIX}${token}`;
}

function readRecord(token) {
    try {
        return JSON.parse(localStorage.getItem(recordKey(token)));
    } catch (e) {
        return null;
    }
}

// Every stored record: this game's, and any left behind by earlier games or other tabs
function storedRecords() {
    const records = [];

    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key.startsWith(RECORD_PREFIX)) continue;

            const record = readRecord(key.slice(RECORD_PREFIX.length));
            if (record && record.token && record.summary) records.push(record);
        }
    } catch (e) {
        // Storage unavailable
    }

    return records;
}

function removeRecord(token) {
    try {
        localStorage.removeItem(recordKey(token));
    } catch (e) {
        // Storage unavailable: nothing to remove
    }
}

// The game this tab was last playing, which survives a reload of the tab
function rememberTabGame(token) {
    try {
        sessionStorage.setItem(TAB_GAME_KEY, token);
    } catch (e) {
        // Storage unavailable
    }
}

function tabGame() {
    try {
        return sessionStorage.getItem(TAB_GAME_KEY);
    } catch (e) {
        return null;
    }
}

function saveRecord(ended = false) {
    if (!session || !session.token) return;

    try {
        localStorage.setItem(recordKey(session.token), JSON.stringify({
            token: session.token,
            offline: session.mode === 'offline',
            ended,
            pickups: session.pickups,
            items: session.items,
            summary: session.getSummary(),
            savedAt: Date.now()
        }));
    } catch (e) {
        // Storage unavailable: the game is still recorded if it reaches its end
    }
}

function finishBody(record) {
    return {
        ...record.summary,
        pickups: record.pickups,
        items: record.items,
        offline: record.offline,
        abandoned: !record.ended
    };
}

// Hand in games left over from earlier (left, closed or crashed before they were recorded)
async function handInLeftovers() {
    const ownToken = tabGame();

    for (const record of storedRecords()) {
        if (session && session.token === record.token) continue;

        // A fresh record that is not this tab's own may be a game running in another tab
        const mine = record.token === ownToken;
        if (!mine && Date.now() - (record.savedAt || 0) < LIVE_RECORD_MS) continue;

        try {
            const response = await post(gamesUrl(record.token, 'finish'), finishBody(record));
            // Recorded, or a record the server will never take: either way it is done with
            if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
                removeRecord(record.token);
            }
        } catch (e) {
            // Still no connection: try again next time
        }
    }
}

function goOffline(current) {
    if (current.mode === 'offline') return;

    current.mode = 'offline';
    current.schedule = [];
    saveRecord();
    current.onOffline();
}

async function openGame(current, playerName, faction, startZone) {
    while (session === current && !current.token) {
        try {
            const response = await post(gamesUrl(), { name: playerName, faction, startZone, version: GAME_VERSION });
            if (response.ok) {
                const data = await response.json();
                current.token = data.game;
                // The purse, after the site took the price of any skip
                if (siteBoot.user && typeof data.coins === 'number') siteBoot.user.coins = data.coins;

                // Answered too late: the game is recorded, but as an offline one
                if (session === current && current.mode === 'connecting') {
                    current.chunkSeconds = data.chunkSeconds;
                    current.schedule = data.drops;
                    current.chunksReceived = 1;
                    current.mode = 'online';
                }
                if (session === current) {
                    rememberTabGame(current.token);
                    saveRecord();
                }
                return;
            }
        } catch (e) {
            // Retry below
        }

        if (current.mode !== 'connecting') return;
        await new Promise(resolve => setTimeout(resolve, RETRY_MS));
    }
}

async function requestChunk(current, chunk) {
    current.requesting = true;
    current.lastRequestAt = performance.now();
    const reported = current.pickups.length;

    try {
        const response = await post(gamesUrl(current.token, 'drops'), {
            chunk,
            pickups: current.pickups.slice(current.pickupsReported)
        });

        if (response.ok) {
            const data = await response.json();
            if (current.mode === 'online' && current.chunksReceived === chunk) {
                current.schedule.push(...data.drops);
                current.schedule.sort((a, b) => a.at - b.at);
                current.chunksReceived = chunk + 1;
                current.pickupsReported = reported;
            }
        } else if (response.status === 409) {
            // The server has closed this game
            if (session === current) goOffline(current);
        }
        // Anything else (too early, rate limited, server error) is retried from update()
    } catch (e) {
        // Retried from update()
    } finally {
        current.requesting = false;
    }
}

// Whether the server, not the game's own dice, decides when this item drops
export function serverDecides(item) {
    return Boolean(session) && session.mode !== 'offline' && SERVER_TYPES.has(item.type);
}

// Whether catching this item earns coins. A rare item only does when the server offered it.
export function earnsCoins(item, dropId = null) {
    if (!session) return true;
    return !SERVER_TYPES.has(item.type) || (dropId !== null && dropId !== undefined);
}

/**
 * A boss was defeated. Resolves to what it dropped, as the server decided:
 * { item: { id, name, rarity }, kept, timesFound } - "kept" is false for guests, who are only
 * shown the item. Resolves to null when the server could not be asked.
 */
export async function reportBoss(bossId) {
    const current = session;
    if (!current) return null;

    for (let attempt = 0; attempt < 4 && session === current; attempt++) {
        if (current.token) {
            try {
                const response = await post(gamesUrl(current.token, 'bosses'), { boss: bossId });
                if (response.ok) return await response.json();
                // Too early or too many requests may pass; anything else will not
                if (response.status >= 400 && response.status < 500 && response.status !== 425 && response.status !== 429) return null;
            } catch (e) {
                // Retried below
            }
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_MS));
    }

    return null;
}

/**
 * A game is starting.
 * @param {string}   playerName  Name typed by a guest (accounts play under their own name)
 * @param {string}   faction     The side the player chose: 'alliance' or 'horde'
 * @param {number}   startZone   The zone the game starts in: above 1 when the player pays to skip ahead
 * @param {Function} getSummary  Returns the game's result so far: { score, level, gameTime, ... }
 * @param {Function} onOffline   Called once if the game loses the server
 */
export function beginGame({ playerName, faction, startZone = 1, getSummary, onOffline }) {
    if (!siteBoot || !siteBoot.urls.games) {
        session = null;
        return;
    }

    session = {
        token: null,
        mode: 'connecting',     // connecting -> online -> offline
        chunkSeconds: 30,
        chunksReceived: 0,
        requesting: false,
        lastRequestAt: -Infinity,
        lastSavedAt: 0,
        schedule: [],           // Drops still to appear: { id, item, at }
        pickups: [],            // Ids of the drops picked up
        pickupsReported: 0,     // How many of those the server has been told about
        items: {},              // Everything picked up, by item id
        getSummary,
        onOffline
    };

    // The game this tab played before (if it was left unfinished) is handed in first; the tab's
    // own game is only replaced once the new one has opened
    handInLeftovers();
    openGame(session, playerName, faction, startZone);
}

/**
 * Call once per simulation step. Returns the server's drops that are due to appear now.
 * @param {number} elapsedSeconds  Seconds of play so far
 */
export function update(elapsedSeconds) {
    const current = session;
    if (!current || current.mode === 'offline') return [];

    if (current.mode === 'connecting') {
        if (elapsedSeconds >= OPEN_DEADLINE_SECONDS) goOffline(current);
        return [];
    }

    const nextChunkStart = current.chunksReceived * current.chunkSeconds;
    if (elapsedSeconds >= nextChunkStart) {
        // The chunk being played never arrived
        goOffline(current);
        return [];
    }

    if (elapsedSeconds >= nextChunkStart - REQUEST_LEAD_SECONDS
        && !current.requesting
        && performance.now() - current.lastRequestAt >= RETRY_MS) {
        requestChunk(current, current.chunksReceived);
    }

    if (elapsedSeconds - current.lastSavedAt >= SAVE_EVERY_SECONDS) {
        current.lastSavedAt = elapsedSeconds;
        saveRecord();
    }

    const due = [];
    while (current.schedule.length > 0 && current.schedule[0].at <= elapsedSeconds) {
        due.push(current.schedule.shift());
    }
    return due;
}

/**
 * An item was picked up.
 * @param {string}      itemId
 * @param {number|null} dropId  The server's drop it came from, if any
 */
export function recordPickup(itemId, dropId = null) {
    if (!session) return;

    session.items[itemId] = (session.items[itemId] || 0) + 1;
    if (dropId !== null && dropId !== undefined) session.pickups.push(dropId);
    saveRecord();
}

/**
 * The game is over. Resolves to { legal, rank, scores, coins } once the server has recorded it, to
 * { legal: false } when it could not be recorded, or returns null when the game is not played
 * under the site (the caller keeps its own scores then).
 */
export function finishGame() {
    const current = session;
    if (!current) return null;

    if (!current.token) {
        // The server never answered: nothing to hand in
        current.mode = 'offline';
        return Promise.resolve({ legal: false, rank: null, scores: null });
    }

    // Stored as ended first, so it is handed in as a finished game if this request fails
    saveRecord(true);
    const body = finishBody({
        summary: current.getSummary(),
        pickups: current.pickups,
        items: current.items,
        offline: current.mode === 'offline',
        ended: true
    });

    return post(gamesUrl(current.token, 'finish'), body)
        .then(async response => {
            if (!response.ok) throw new Error(`Server answered ${response.status}`);
            const result = await response.json();
            removeRecord(current.token);
            return result;
        })
        .catch(error => {
            // The stored record is handed in the next time the game is opened
            console.log('Could not record the game:', error);
            return { legal: false, rank: null, scores: null };
        });
}

if (siteBoot && siteBoot.urls.games) {
    handInLeftovers();
}
