// Notification system for spell effects.
// Visible gameplay notifications are rendered on canvas to avoid active-loop DOM churn.
import {
    addHudNotification,
    clearHudNotifications,
    getHudStatus,
    removePersistentHudNotification,
    setPersistentHudNotification
} from './hudNotificationSystem.js';

class NotificationSystem {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.persistentNotifications = new Map(); // For ongoing effects
        this.activeTypes = new Set(); // Track active notification types
        this.notificationOrder = []; // Track order of ALL notifications for removal (regular + persistent)
        this.maxNotifications = 4; // Maximum number of notifications allowed at the TOP (total)
        this.nextId = 1;
        this.isMobile = this.detectMobile();
    }

    // Detect mobile devices
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    }

    // Initialize the notification system
    initialize() {
        this.container = document.getElementById('spellNotifications');
        if (!this.container) {
            console.error('Spell notifications container not found');
            return false;
        }
        
        // Log mobile detection status
        if (this.isMobile) {
            console.log('📱 Mobile device detected - regular notifications disabled for performance. Buff tracker remains active.');
        } else {
            console.log('🖥️ Desktop device detected - all notifications enabled.');
        }
        
        return true;
    }

    // Show a notification (with duplicate prevention)
    showNotification(message, duration = 3000, type = 'activation', allowDuplicates = false) {
        return addHudNotification(message, duration, type, allowDuplicates);
    }

    // Remove a notification
    removeNotification(id) {
        this.notifications.delete(id);
    }

    // Clear all notifications
    clearAll() {
        clearHudNotifications();
        this.notifications.clear();
        this.persistentNotifications.clear();
        this.notificationOrder = [];
    }

    // Get current notification status (for debugging)
    getStatus() {
        const hudStatus = getHudStatus();
        return {
            regularNotifications: hudStatus.notifications,
            persistentNotifications: hudStatus.persistentNotifications,
            totalVisible: hudStatus.notifications + hudStatus.persistentNotifications,
            maxTotalAllowed: this.maxNotifications,
            orderQueue: this.notificationOrder.length,
            activeTypes: Array.from(this.activeTypes),
            isMobile: this.isMobile,
            mobileNotificationsDisabled: false,
            canvasHud: true
        };
    }

    // Check if regular notifications are enabled (disabled on mobile for performance)
    areRegularNotificationsEnabled() {
        return true;
    }

    // Show or update a persistent notification for ongoing effects
    showPersistentNotification(effectKey, message, type = 'activation', isActive = true) {
        if (!isActive) {
            this.removePersistentNotification(effectKey);
            return;
        }

        this.persistentNotifications.set(effectKey, { effectKey, message, type });
        return setPersistentHudNotification(effectKey, message, type, true);
    }

    // Remove a persistent notification
    removePersistentNotification(effectKey) {
        this.persistentNotifications.delete(effectKey);
        removePersistentHudNotification(effectKey);
    }

    // Get notification type based on message content
    getNotificationType(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('activated') || lowerMessage.includes('cast')) {
            return 'activation';
        }
        if (lowerMessage.includes('expired') || lowerMessage.includes('ended')) {
            return 'expiration';
        }
        if (lowerMessage.includes('cooldown') || lowerMessage.includes('wait')) {
            return 'cooldown';
        }
        if (lowerMessage.includes('victory') || lowerMessage.includes('possible again')) {
            return 'success';
        }
        if (lowerMessage.includes('flask of titans') || lowerMessage.includes('restored')) {
            return 'flask_of_titans';
        }
        if (lowerMessage.includes('teleport') || lowerMessage.includes('safe area')) {
            return 'teleport';
        }
        if (lowerMessage.includes('failed') || lowerMessage.includes('no effect')) {
            return 'warning';
        }
        
        return 'activation'; // Default
    }

    // Enhanced notification with custom styling
    showSpellNotification(message, duration = 3000, customType = null, options = {}) {
        const type = customType || this.getNotificationType(message);
        
        // Check if this should be a persistent notification (buff tracker - always show)
        if (options.persistent) {
            return this.showPersistentNotification(options.effectKey || type, message, type, true);
        }
        
        // For regular notifications, check if we should prevent duplicates
        const allowDuplicates = options.allowDuplicates !== undefined ? options.allowDuplicates : false;
        return this.showNotification(message, duration, type, allowDuplicates);
    }

    // Update persistent notifications (called from game loop)
    updatePersistentNotifications(gameState) {
        if (!gameState) return;

        // Update shield notifications
        if (gameState.shieldActive && gameState.shieldTimer > 0) {
            const seconds = Math.ceil(gameState.shieldTimer / 60);
            this.showPersistentNotification('shield', `Shield Active (${seconds}s)`, 'shield', true);
        } else {
            this.removePersistentNotification('shield');
        }

        // Update freeze notifications
        if (gameState.freezeTimeActive && gameState.freezeTimeTimer > 0) {
            const seconds = Math.ceil(gameState.freezeTimeTimer / 60);
            this.showPersistentNotification('freeze', `Time Frozen (${seconds}s)`, 'freeze', true);
        } else {
            this.removePersistentNotification('freeze');
        }

        // Update speed boost notifications
        if (gameState.speedIncreaseActive && gameState.speedIncreaseTimer > 0) {
            const seconds = Math.ceil(gameState.speedIncreaseTimer / 60);
            const percent = Math.round(gameState.currentSpeedIncreasePercent);
            this.showPersistentNotification('speed_boost', `Speed +${percent}% (${seconds}s)`, 'boost', true);
        } else {
            this.removePersistentNotification('speed_boost');
        }

        // Update time slow notifications
        if (gameState.timeSlowActive && gameState.timeSlowTimer > 0) {
            const seconds = Math.ceil(gameState.timeSlowTimer / 60);
            const slowPercent = Math.round((1 - gameState.timeSlowMultiplier) * 100);
            this.showPersistentNotification('time_slow', `Time Slow ${slowPercent}% (${seconds}s)`, 'slow', true);
        } else {
            this.removePersistentNotification('time_slow');
        }

        // Update DOT notifications (Shadowbolt)
        if (gameState.shadowboltDots && gameState.shadowboltDots.length > 0) {
            const stacks = gameState.shadowboltDots.length;
            const maxDuration = Math.max(...gameState.shadowboltDots.map(dot => dot.remainingDuration));
            const seconds = Math.ceil(maxDuration / 60);
            this.showPersistentNotification('shadowbolt', `Shadowbolt x${stacks} (${seconds}s)`, 'damage', true);
        } else {
            this.removePersistentNotification('shadowbolt');
        }

        // Update HOT notifications (Chicken Food)
        if (gameState.chickenFoodHots && gameState.chickenFoodHots.length > 0) {
            const stacks = gameState.chickenFoodHots.length;
            const maxDuration = Math.max(...gameState.chickenFoodHots.map(hot => hot.remainingDuration));
            const seconds = Math.ceil(maxDuration / 60);
            this.showPersistentNotification('chicken_food', `Regen x${stacks} (${seconds}s)`, 'healing', true);
        } else {
            this.removePersistentNotification('chicken_food');
        }

        // Update reverse gravity notifications
        if (gameState.reverseGravityActive && gameState.reverseGravityTimer > 0) {
            const seconds = Math.ceil(gameState.reverseGravityTimer / 60);
            this.showPersistentNotification('reverse_gravity', `Reverse Gravity (${seconds}s)`, 'gravity', true);
        } else {
            this.removePersistentNotification('reverse_gravity');
        }
    }
}

// Create and export singleton instance
export const notificationSystem = new NotificationSystem(); 