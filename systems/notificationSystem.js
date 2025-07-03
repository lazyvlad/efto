// Notification system for spell effects
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
        if (!this.container) {
            console.warn('Notification system not initialized');
            return;
        }

        // Disable regular notifications on mobile devices to improve performance
        if (this.isMobile) {
            console.log(`Mobile device detected - skipping regular notification: "${message}"`);
            return null;
        }

        console.log(`Attempting to show notification: "${message}" (type: ${type}, allowDuplicates: ${allowDuplicates})`);
        console.log(`Current notifications count: ${this.notifications.size}, persistent: ${this.persistentNotifications.size}, total: ${this.notifications.size + this.persistentNotifications.size}`);

        // Prevent duplicate notifications of the same type unless allowed
        if (!allowDuplicates && this.activeTypes.has(type)) {
            console.log(`Skipping duplicate notification of type: ${type}`);
            return null;
        }

        // Check if we need to remove oldest notifications to stay under the limit
        // Count BOTH regular and persistent notifications against the limit
        while ((this.notifications.size + this.persistentNotifications.size) >= this.maxNotifications && this.notificationOrder.length > 0) {
            const oldestId = this.notificationOrder[0];
            if (this.notifications.has(oldestId)) {
                console.log(`Removing oldest regular notification (ID: ${oldestId}) to make room for new one. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
                this.removeNotification(oldestId);
            } else if (this.persistentNotifications.has(oldestId)) {
                console.log(`Removing oldest persistent notification (ID: ${oldestId}) to make room for new one. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
                this.removePersistentNotification(oldestId);
            } else {
                // Clean up orphaned ID from order tracking
                console.log(`Cleaning up orphaned notification ID: ${oldestId}`);
                this.notificationOrder.shift();
            }
        }

        const id = this.nextId++;
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `spell-notification ${type}`;
        notification.textContent = message;
        notification.id = `notification-${id}`;

        // Add to container
        this.container.appendChild(notification);

        // Track active type
        this.activeTypes.add(type);

        // Store reference
        this.notifications.set(id, {
            element: notification,
            timeout: null,
            type: type
        });

        // Add to order tracking (newest at the end)
        this.notificationOrder.push(id);

        // Set up auto-removal
        const timeoutId = setTimeout(() => {
            this.removeNotification(id);
        }, duration);

        this.notifications.get(id).timeout = timeoutId;

        console.log(`Successfully added notification ID: ${id}. New count: ${this.notifications.size}, persistent: ${this.persistentNotifications.size}`);

        return id;
    }

    // Remove a notification
    removeNotification(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;

        const { element, timeout, type } = notificationData;

        // Clear timeout
        if (timeout) {
            clearTimeout(timeout);
        }

        // Remove from active types tracking - only if no other notifications of this type exist
        if (type) {
            // Check if there are other notifications of the same type
            const hasOtherOfSameType = Array.from(this.notifications.values())
                .some(n => n.type === type && n !== notificationData) ||
                Array.from(this.persistentNotifications.values())
                .some(n => n.type === type);
            
            if (!hasOtherOfSameType) {
                this.activeTypes.delete(type);
                console.log(`Removing type "${type}" from activeTypes - no more notifications of this type`);
            } else {
                console.log(`Keeping type "${type}" in activeTypes - other notifications of this type still exist`);
            }
        }

        // Remove from order tracking
        const orderIndex = this.notificationOrder.indexOf(id);
        if (orderIndex !== -1) {
            this.notificationOrder.splice(orderIndex, 1);
        }

        // Add fade out animation
        element.classList.add('fade-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300); // Match fade-out animation duration

        // Remove from map
        this.notifications.delete(id);
    }

    // Clear all notifications
    clearAll() {
        for (const [id] of this.notifications) {
            this.removeNotification(id);
        }
        for (const [effectKey] of this.persistentNotifications) {
            this.removePersistentNotification(effectKey);
        }
        // Clear order tracking
        this.notificationOrder = [];
    }

    // Get current notification status (for debugging)
    getStatus() {
        return {
            regularNotifications: this.notifications.size,
            persistentNotifications: this.persistentNotifications.size,
            totalVisible: this.notifications.size + this.persistentNotifications.size,
            maxTotalAllowed: this.maxNotifications,
            orderQueue: this.notificationOrder.length,
            activeTypes: Array.from(this.activeTypes),
            isMobile: this.isMobile,
            mobileNotificationsDisabled: this.isMobile
        };
    }

    // Check if regular notifications are enabled (disabled on mobile for performance)
    areRegularNotificationsEnabled() {
        return !this.isMobile;
    }

    // Show or update a persistent notification for ongoing effects
    showPersistentNotification(effectKey, message, type = 'activation', isActive = true) {
        if (!this.container) {
            console.warn('Notification system not initialized');
            return;
        }

        if (!isActive) {
            this.removePersistentNotification(effectKey);
            return;
        }

        let notification = this.persistentNotifications.get(effectKey);
        
        if (!notification) {
            // Check if we need to remove old notifications to make room
            // Apply the same limit to persistent notifications
            while ((this.notifications.size + this.persistentNotifications.size) >= this.maxNotifications && this.notificationOrder.length > 0) {
                const oldestId = this.notificationOrder[0];
                if (this.notifications.has(oldestId)) {
                    console.log(`Removing oldest regular notification (ID: ${oldestId}) to make room for persistent notification. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
                    this.removeNotification(oldestId);
                } else if (this.persistentNotifications.has(oldestId)) {
                    console.log(`Removing oldest persistent notification (ID: ${oldestId}) to make room for new persistent notification. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
                    this.removePersistentNotification(oldestId);
                } else {
                    // Clean up orphaned ID from order tracking
                    console.log(`Cleaning up orphaned notification ID: ${oldestId}`);
                    this.notificationOrder.shift();
                }
            }

            // Create new persistent notification
            const element = document.createElement('div');
            element.className = `spell-notification ${type} persistent`;
            element.id = `persistent-${effectKey}`;
            
            // Add to container at the top
            if (this.container.firstChild) {
                this.container.insertBefore(element, this.container.firstChild);
            } else {
                this.container.appendChild(element);
            }

            notification = {
                element: element,
                type: type,
                effectKey: effectKey
            };
            
            this.persistentNotifications.set(effectKey, notification);
            this.activeTypes.add(type);
            
            // Add to order tracking (persistent notifications go to the end too)
            this.notificationOrder.push(effectKey);
            
            console.log(`Created persistent notification: ${effectKey}. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
        }

        // Update the message
        notification.element.textContent = message;
        
        return effectKey;
    }

    // Remove a persistent notification
    removePersistentNotification(effectKey) {
        const notification = this.persistentNotifications.get(effectKey);
        if (!notification) return;

        const { element, type } = notification;

        // Check if this was the last notification of this type
        const hasOtherOfSameType = Array.from(this.persistentNotifications.values())
            .some(n => n.type === type && n.effectKey !== effectKey) ||
            Array.from(this.notifications.values())
            .some(n => n.type === type);

        if (!hasOtherOfSameType) {
            this.activeTypes.delete(type);
        }

        // Remove from order tracking
        const orderIndex = this.notificationOrder.indexOf(effectKey);
        if (orderIndex !== -1) {
            this.notificationOrder.splice(orderIndex, 1);
        }

        // Add fade out animation
        element.classList.add('fade-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);

        // Remove from map
        this.persistentNotifications.delete(effectKey);
        
        console.log(`Removed persistent notification: ${effectKey}. Total count: ${this.notifications.size + this.persistentNotifications.size}`);
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
            this.showPersistentNotification('shield', `🛡️ Shield Active (${seconds}s)`, 'success', true);
        } else {
            this.removePersistentNotification('shield');
        }

        // Update freeze notifications
        if (gameState.freezeTimeActive && gameState.freezeTimeTimer > 0) {
            const seconds = Math.ceil(gameState.freezeTimeTimer / 60);
            this.showPersistentNotification('freeze', `❄️ Time Frozen (${seconds}s)`, 'freeze', true);
        } else {
            this.removePersistentNotification('freeze');
        }

        // Update speed boost notifications
        if (gameState.speedIncreaseActive && gameState.speedIncreaseTimer > 0) {
            const seconds = Math.ceil(gameState.speedIncreaseTimer / 60);
            const percent = Math.round(gameState.currentSpeedIncreasePercent);
            this.showPersistentNotification('speed_boost', `⚡ Speed +${percent}% (${seconds}s)`, 'boost', true);
        } else {
            this.removePersistentNotification('speed_boost');
        }

        // Update time slow notifications
        if (gameState.timeSlowActive && gameState.timeSlowTimer > 0) {
            const seconds = Math.ceil(gameState.timeSlowTimer / 60);
            const slowPercent = Math.round((1 - gameState.timeSlowMultiplier) * 100);
            this.showPersistentNotification('time_slow', `🔵 Time Slow ${slowPercent}% (${seconds}s)`, 'activation', true);
        } else {
            this.removePersistentNotification('time_slow');
        }

        // Update DOT notifications (Shadowbolt)
        if (gameState.shadowboltDots && gameState.shadowboltDots.length > 0) {
            const stacks = gameState.shadowboltDots.length;
            const maxDuration = Math.max(...gameState.shadowboltDots.map(dot => dot.remainingDuration));
            const seconds = Math.ceil(maxDuration / 60);
            this.showPersistentNotification('shadowbolt', `🌑 Shadowbolt x${stacks} (${seconds}s)`, 'damage', true);
        } else {
            this.removePersistentNotification('shadowbolt');
        }

        // Update HOT notifications (Chicken Food)
        if (gameState.chickenFoodHots && gameState.chickenFoodHots.length > 0) {
            const stacks = gameState.chickenFoodHots.length;
            const maxDuration = Math.max(...gameState.chickenFoodHots.map(hot => hot.remainingDuration));
            const seconds = Math.ceil(maxDuration / 60);
            this.showPersistentNotification('chicken_food', `🐔 Regen x${stacks} (${seconds}s)`, 'healing', true);
        } else {
            this.removePersistentNotification('chicken_food');
        }

        // Update reverse gravity notifications
        if (gameState.reverseGravityActive && gameState.reverseGravityTimer > 0) {
            const seconds = Math.ceil(gameState.reverseGravityTimer / 60);
            this.showPersistentNotification('reverse_gravity', `🔄 Reverse Gravity (${seconds}s)`, 'teleport', true);
        } else {
            this.removePersistentNotification('reverse_gravity');
        }
    }
}

// Create and export singleton instance
export const notificationSystem = new NotificationSystem(); 