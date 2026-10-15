// Canvas-rendered gameplay HUD state for buffs and notifications.
import { assetRegistry } from '../data/assetRegistry.js';

const TYPE_COLORS = {
    activation: '#4ecdc4',
    boost: '#FFD700',
    cooldown: '#FF6B6B',
    damage: '#FF6B6B',
    dodge: '#00FF88',
    expiration: '#FFD700',
    flask_of_titans: '#FF69B4',
    food: '#32CD32',
    freeze: '#00BFFF',
    gravity: '#FF69B4',
    healing: '#32CD32',
    shield: '#FFD700',
    slow: '#9370DB',
    success: '#00FF00',
    teleport: '#9370DB',
    warning: '#FFA500',
    default: '#FFD700'
};

const activeBuffs = new Map();
const persistentNotifications = new Map();
const notifications = [];
const iconCache = new Map();

let nextNotificationId = 1;

function colorForType(type) {
    return TYPE_COLORS[type] || TYPE_COLORS.default;
}

function normalizeTimer(timer) {
    return Number.isFinite(timer) ? Math.max(0, timer) : 0;
}

function cleanHudText(text) {
    return String(text || '')
        .replace(/[\u2600-\u27BF\uFE0F\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function resolveHudIcon(key, type) {
    const iconByKey = {
        chickenFoodHot: assetRegistry.powerups.chickenFood,
        chicken_food: assetRegistry.powerups.chickenFood,
        dodgeBoost: assetRegistry.powerups.aspectOfTheMonkey,
        dragonCry: assetRegistry.buffs.onyxia,
        freeze: assetRegistry.powerups.frostNova,
        freezeTime: assetRegistry.powerups.frostNova,
        reverseGravity: assetRegistry.powerups.reverseGravity,
        reverse_gravity: assetRegistry.powerups.reverseGravity,
        shadowbolt: assetRegistry.projectiles.shadowbolt,
        shadowboltDot: assetRegistry.projectiles.shadowbolt,
        shield: assetRegistry.powerups.powerWordShield,
        speedBoost: assetRegistry.powerups.speedBoost,
        speed_boost: assetRegistry.powerups.speedBoost,
        spell_dragon_cry: assetRegistry.buffs.onyxia,
        spell_flask_of_titans: assetRegistry.buffs.flaskOfTitans,
        spell_zandalari: assetRegistry.buffs.zgBuff1,
        timeSlow: assetRegistry.buffs.zgBuff1,
        time_slow: assetRegistry.buffs.zgBuff1,
        zandalariSpell: assetRegistry.buffs.zgBuff1
    };

    const iconByType = {
        boost: assetRegistry.powerups.speedBoost,
        damage: assetRegistry.projectiles.shadowbolt,
        dodge: assetRegistry.powerups.aspectOfTheMonkey,
        flask: assetRegistry.buffs.flaskOfTitans,
        flask_of_titans: assetRegistry.buffs.flaskOfTitans,
        food: assetRegistry.powerups.chickenFood,
        freeze: assetRegistry.powerups.frostNova,
        gravity: assetRegistry.powerups.reverseGravity,
        healing: assetRegistry.powerups.chickenFood,
        shield: assetRegistry.powerups.powerWordShield,
        slow: assetRegistry.buffs.zgBuff1,
        teleport: assetRegistry.buffs.onyxia
    };

    return iconByKey[key] || iconByType[type] || null;
}

function getIconImage(src) {
    if (!src) return null;

    if (!iconCache.has(src)) {
        const image = new Image();
        image.src = src;
        iconCache.set(src, image);
    }

    const image = iconCache.get(src);
    return image.complete && image.naturalWidth > 0 ? image : null;
}

export function addOrUpdateBuff(id, name, effect, timer, type = 'default') {
    activeBuffs.set(id, {
        id,
        name: cleanHudText(name),
        effect: cleanHudText(effect),
        timer: normalizeTimer(timer),
        type,
        iconSrc: resolveHudIcon(id, type)
    });
}

export function removeBuffState(id) {
    activeBuffs.delete(id);
}

export function clearBuffStates() {
    activeBuffs.clear();
}

export function updateBuffStates(deltaTimeMultiplier) {
    for (const [id, buff] of activeBuffs) {
        buff.timer = normalizeTimer(buff.timer - deltaTimeMultiplier);
        if (buff.timer <= 0) {
            activeBuffs.delete(id);
        }
    }
}

export function addHudNotification(message, duration = 3000, type = 'activation', allowDuplicates = false) {
    if (!allowDuplicates && notifications.some(notification => notification.type === type)) {
        return null;
    }

    const now = Date.now();
    const notification = {
        id: nextNotificationId++,
        message: cleanHudText(message),
        type,
        iconSrc: resolveHudIcon(null, type),
        createdAt: now,
        expiresAt: now + duration
    };

    notifications.push(notification);

    while (notifications.length > 4) {
        notifications.shift();
    }

    return notification.id;
}

export function setPersistentHudNotification(effectKey, message, type = 'activation', isActive = true) {
    if (!isActive) {
        persistentNotifications.delete(effectKey);
        return null;
    }

    persistentNotifications.set(effectKey, {
        effectKey,
        message: cleanHudText(message),
        type,
        iconSrc: resolveHudIcon(effectKey, type),
        updatedAt: Date.now()
    });

    return effectKey;
}

export function removePersistentHudNotification(effectKey) {
    persistentNotifications.delete(effectKey);
}

export function clearHudNotifications() {
    notifications.length = 0;
    persistentNotifications.clear();
}

export function getHudStatus() {
    return {
        buffs: activeBuffs.size,
        notifications: notifications.length,
        persistentNotifications: persistentNotifications.size
    };
}

export function pruneExpiredHudNotifications(now = Date.now()) {
    for (let index = notifications.length - 1; index >= 0; index--) {
        if (notifications[index].expiresAt <= now) {
            notifications.splice(index, 1);
        }
    }
}

function roundRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + width - safeRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    ctx.lineTo(x + width, y + height - safeRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    ctx.lineTo(x + safeRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
}

function drawCard(ctx, { x, y, width, height, borderColor, fillAlpha = 0.9 }) {
    ctx.save();

    roundRect(ctx, x, y, width, height, 8);
    ctx.fillStyle = `rgba(0, 0, 0, ${fillAlpha})`;
    ctx.fill();

    const glow = ctx.createLinearGradient(x, y, x + width, y + height);
    glow.addColorStop(0, `${borderColor}33`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

// Whether a picture is cut out (its corners see-through), as a shield or a frost crystal is,
// rather than a square painting; worked out once for each picture
const cutOut = new Map();
function isCutOut(image) {
    if (!cutOut.has(image)) {
        let answer = false;
        try {
            const probe = document.createElement('canvas');
            probe.width = probe.height = 8;
            const context = probe.getContext('2d', { willReadFrequently: true });
            context.drawImage(image, 0, 0, 8, 8);
            const corners = [[0, 0], [7, 0], [0, 7], [7, 7]].map(([cx, cy]) => context.getImageData(cx, cy, 1, 1).data[3]);
            answer = Math.max(...corners) < 24;
        } catch (e) {
            // Unreadable: drawn in its frame
        }
        cutOut.set(image, answer);
    }
    return cutOut.get(image);
}

function drawIcon(ctx, src, x, y, size, borderColor) {
    const image = getIconImage(src);
    if (!image) return false;

    // A cut-out picture stands on its own (no shadow: a canvas blur every frame costs more than
    // it shows); only a square painting gets the dark tile and the coloured frame
    if (isCutOut(image)) {
        ctx.save();
        const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight) || 1;
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        ctx.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
        ctx.restore();
        return true;
    }

    ctx.save();

    roundRect(ctx, x, y, size, size, 5);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
    ctx.clip();
    ctx.drawImage(image, x, y, size, size);

    ctx.restore();

    ctx.save();
    roundRect(ctx, x, y, size, size, 5);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    return true;
}

function truncateText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) {
        return text;
    }

    let truncated = text;
    while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
        truncated = truncated.slice(0, -1);
    }

    return `${truncated}...`;
}

// The canvas's size on the page, asked for twice a second at most: asking makes the browser lay
// out the page first, if anything on it has changed, and this is drawn every frame
const shownSize = { width: 0, height: 0, at: -Infinity };

function getUiScale(canvas) {
    const now = performance.now();
    if (now - shownSize.at > 500) {
        shownSize.width = canvas.clientWidth;
        shownSize.height = canvas.clientHeight;
        shownSize.at = now;
    }
    if (!shownSize.width || !shownSize.height) {
        return 1;
    }

    const xScale = canvas.logicalWidth / shownSize.width;
    const yScale = canvas.logicalHeight / shownSize.height;

    return Math.max(1, Math.min(xScale, yScale));
}

function getHudScale(canvas) {
    const baseScale = getUiScale(canvas);
    const isCompact = canvas.deviceType === 'mobile' || canvas.logicalWidth <= 768 || canvas.logicalHeight <= 640;

    return isCompact ? baseScale * 0.72 : baseScale;
}

// ----- Messages above the play field -----
// On screens where the play field does not reach the top (most phones, and any window with a
// band above the frame), the messages are shown in that band as page elements, so they take no
// room from the game. Where the field fills the screen they are drawn on it, as below.

const ABOVE_LINE_HEIGHT = 30;   // Page pixels a line of message needs
let messagesAboveField = false;
let roomAbove = { value: 0, measuredAt: -Infinity };
let aboveBar = null;
let aboveShown = '';

// Page pixels between the top of the screen and the play field
function roomAboveField(canvas) {
    const now = performance.now();
    if (now - roomAbove.measuredAt > 500) {
        roomAbove = { value: canvas.getBoundingClientRect().top, measuredAt: now };
    }
    return roomAbove.value;
}

// Nothing is shown above the field while no game is on screen
export function hideMessagesAboveField() {
    showAboveField([]);
}

// Whether the messages are being shown above the play field (the boss's health bar can then
// sit right at the top of it)
export function areMessagesAboveField() {
    return messagesAboveField;
}

function showAboveField(items) {
    // Only touch the page when what is shown changes
    const shown = items.map(item => `${item.type}|${item.iconSrc || ''}|${item.message}`).join('\n');
    if (shown === aboveShown) return;
    aboveShown = shown;

    if (!aboveBar) {
        aboveBar = document.createElement('div');
        aboveBar.id = 'messagesAboveField';
        aboveBar.setAttribute('aria-live', 'polite');
        document.body.appendChild(aboveBar);
    }

    aboveBar.replaceChildren(...items.map(item => {
        const line = document.createElement('div');
        line.className = 'message-above-field';
        line.style.borderColor = colorForType(item.type);

        if (getIconImage(item.iconSrc)) {
            const icon = document.createElement('img');
            icon.src = item.iconSrc;
            icon.alt = '';
            line.appendChild(icon);
        }

        const text = document.createElement('span');
        text.textContent = item.message;
        line.appendChild(text);
        return line;
    }));
}

// The bar at the top of the play field. It sits over the area things fall through, so it is kept
// out of the way: one line on a phone, two elsewhere, only as wide as its text, see-through, and
// the newest message replaces older ones rather than stacking.
function drawNotifications(ctx, canvas, uiScale) {
    pruneExpiredHudNotifications();

    const isCompact = canvas.deviceType === 'mobile' || canvas.logicalWidth <= 768;
    const maxVisible = isCompact ? 1 : 2;

    // When the screen has room above the play field, the messages go there, off the field
    const linesAbove = Math.min(maxVisible, Math.floor((roomAboveField(canvas) - 10) / ABOVE_LINE_HEIGHT));
    messagesAboveField = linesAbove >= 1;

    const topItems = [
        ...notifications.slice().reverse(),
        ...Array.from(persistentNotifications.values())
    ].slice(0, messagesAboveField ? linesAbove : maxVisible);

    showAboveField(messagesAboveField ? topItems : []);
    if (messagesAboveField || topItems.length === 0) return;

    // Phones keep text at a readable size whatever the HUD scale
    const fontSize = isCompact ? 11 : 13 * uiScale;
    const height = isCompact ? 22 : 26 * uiScale;
    const iconSize = height - (isCompact ? 6 : 8 * uiScale);
    const padding = isCompact ? 8 : 12 * uiScale;
    const gap = isCompact ? 3 : 4 * uiScale;
    const maxWidth = Math.min(450 * Math.max(1, uiScale), canvas.logicalWidth - 24);
    let y = isCompact ? 4 : 5 * uiScale;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px Arial`;

    topItems.forEach(item => {
        const borderColor = colorForType(item.type);
        const hasIcon = Boolean(getIconImage(item.iconSrc));
        const iconSpace = hasIcon ? iconSize + padding / 2 : 0;
        const text = truncateText(ctx, item.message, maxWidth - padding * 2 - iconSpace);
        const width = ctx.measureText(text).width + padding * 2 + iconSpace;
        const x = (canvas.logicalWidth - width) / 2;

        drawCard(ctx, { x, y, width, height, borderColor, fillAlpha: 0.6 });

        if (hasIcon) {
            drawIcon(ctx, item.iconSrc, x + padding / 2, y + (height - iconSize) / 2, iconSize, borderColor);
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(text, x + padding + iconSpace, y + height / 2);
        ctx.shadowBlur = 0;

        y += height + gap;
    });

    ctx.restore();
}

// On a phone held upright the round spell buttons stand in columns on the field's edges. The
// buff cards go above the column at the left edge, out of the strip the hunter moves in. This
// is where that column's top is, in the field's own measure (null when there is none there).
let leftButtons = { top: null, measuredAt: -Infinity };

function topOfLeftButtons(canvas) {
    const now = performance.now();
    if (now - leftButtons.measuredAt > 500) {
        const field = canvas.getBoundingClientRect();
        let top = null;

        document.querySelectorAll('#spellBar .spell-group').forEach(group => {
            const box = group.getBoundingClientRect();
            const atLeftEdge = box.width > 0 && box.left < field.left + field.width / 2 && box.right > field.left;

            if (atLeftEdge && box.top > field.top && box.top < field.bottom) {
                top = (box.top - field.top) * canvas.logicalHeight / field.height;
            }
        });

        leftButtons = { top, measuredAt: now };
    }

    return leftButtons.top;
}

function drawBuffs(ctx, canvas, uiScale) {
    const buffs = Array.from(activeBuffs.values());
    if (buffs.length === 0) return;

    const isCompact = canvas.logicalWidth <= 768 || canvas.logicalHeight <= 520;
    const onPhone = canvas.deviceType === 'mobile';
    const width = (onPhone ? 150 : isCompact ? 180 : 230) * uiScale;
    const height = (isCompact ? 42 : 50) * uiScale;
    const gap = (isCompact ? 5 : 8) * uiScale;
    const x = (isCompact ? 5 : 20) * uiScale;
    const bottom = (isCompact ? 120 : 100) * uiScale;
    const stack = buffs.length * height + (buffs.length - 1) * gap;
    const aboveButtons = onPhone ? topOfLeftButtons(canvas) : null;
    let y = aboveButtons !== null
        ? Math.max(height, aboveButtons - 8 - stack)
        : canvas.logicalHeight - bottom - stack;

    ctx.save();
    ctx.textBaseline = 'middle';

    buffs.forEach(buff => {
        const borderColor = colorForType(buff.type);
        const seconds = Math.ceil(buff.timer / 60);

        drawCard(ctx, { x, y, width, height, borderColor, fillAlpha: 0.9 });
        const iconSize = (isCompact ? 28 : 32) * uiScale;
        const iconX = x + (8 * uiScale);
        const iconY = y + (height - iconSize) / 2;
        const hasIcon = drawIcon(ctx, buff.iconSrc, iconX, iconY, iconSize, borderColor);
        const textX = x + (hasIcon ? (44 * uiScale) : (10 * uiScale));
        const availableTextWidth = width - (hasIcon ? 92 : 58) * uiScale;

        ctx.textAlign = 'left';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${(isCompact ? 11 : 12) * uiScale}px Arial`;
        ctx.fillText(truncateText(ctx, buff.name, availableTextWidth), textX, y + ((isCompact ? 12 : 15) * uiScale));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.font = `${(isCompact ? 10 : 11) * uiScale}px Arial`;
        ctx.fillText(truncateText(ctx, buff.effect, availableTextWidth), textX, y + ((isCompact ? 26 : 31) * uiScale));

        const timerWidth = (isCompact ? 38 : 44) * uiScale;
        const timerX = x + width - timerWidth - (8 * uiScale);
        const timerY = y + height / 2 - (10 * uiScale);

        roundRect(ctx, timerX, timerY, timerWidth, 20 * uiScale, 4 * uiScale);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.fillStyle = seconds <= 3 ? '#FF6B6B' : '#FFFFFF';
        ctx.font = `bold ${(isCompact ? 11 : 12) * uiScale}px Arial`;
        ctx.fillText(`${seconds}s`, timerX + timerWidth / 2, y + height / 2);

        y += height + gap;
    });

    ctx.restore();
}

export function renderCanvasHud(ctx, canvas) {
    if (!ctx || !canvas || !canvas.logicalWidth || !canvas.logicalHeight) return;

    const uiScale = getHudScale(canvas);

    drawNotifications(ctx, canvas, uiScale);
    drawBuffs(ctx, canvas, uiScale);
}
