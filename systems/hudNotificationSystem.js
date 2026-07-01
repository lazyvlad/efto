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

function drawIcon(ctx, src, x, y, size, borderColor) {
    const image = getIconImage(src);
    if (!image) return false;

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

function getUiScale(canvas) {
    if (!canvas.clientWidth || !canvas.clientHeight) {
        return 1;
    }

    const xScale = canvas.logicalWidth / canvas.clientWidth;
    const yScale = canvas.logicalHeight / canvas.clientHeight;

    return Math.max(1, Math.min(xScale, yScale));
}

function drawNotifications(ctx, canvas, uiScale) {
    pruneExpiredHudNotifications();

    const topItems = [
        ...Array.from(persistentNotifications.values()),
        ...notifications
    ].slice(0, 4);

    if (topItems.length === 0) return;

    const width = Math.min(450 * uiScale, canvas.logicalWidth - (30 * uiScale));
    const height = 32 * uiScale;
    const gap = 4 * uiScale;
    const x = (canvas.logicalWidth - width) / 2;
    let y = 5 * uiScale;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    topItems.forEach(item => {
        const borderColor = colorForType(item.type);
        drawCard(ctx, { x, y, width, height, borderColor, fillAlpha: 0.86 });
        const iconSize = 22 * uiScale;
        const iconX = x + (10 * uiScale);
        const iconY = y + (height - iconSize) / 2;
        const hasIcon = drawIcon(ctx, item.iconSrc, iconX, iconY, iconSize, borderColor);
        const textX = hasIcon ? x + width / 2 + (10 * uiScale) : x + width / 2;
        const textMaxWidth = hasIcon ? width - (58 * uiScale) : width - (24 * uiScale);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${14 * uiScale}px Arial`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(truncateText(ctx, item.message, textMaxWidth), textX, y + height / 2);

        y += height + gap;
    });

    ctx.restore();
}

function drawBuffs(ctx, canvas, uiScale) {
    const buffs = Array.from(activeBuffs.values());
    if (buffs.length === 0) return;

    const isCompact = canvas.logicalWidth <= 768 || canvas.logicalHeight <= 520;
    const width = (isCompact ? 180 : 230) * uiScale;
    const height = (isCompact ? 42 : 50) * uiScale;
    const gap = (isCompact ? 5 : 8) * uiScale;
    const x = (isCompact ? 5 : 20) * uiScale;
    const bottom = (isCompact ? 120 : 100) * uiScale;
    let y = canvas.logicalHeight - bottom - (buffs.length * height + (buffs.length - 1) * gap);

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

    const uiScale = getUiScale(canvas);

    drawNotifications(ctx, canvas, uiScale);
    drawBuffs(ctx, canvas, uiScale);
}
