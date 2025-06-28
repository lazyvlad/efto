// Player spells database with structured data
import { assetRegistry } from './assetRegistry.js';

export const playerSpells = [
    {
        id: "dragon_cry",
        name: "Dragon Cry", 
        type: "buff",
        description: "Allows unrestricted movement across the entire screen and increases crit rating by 5%",
        duration: 600, // 10 seconds at 60fps
        effects: {
            unrestricted_movement: true,
            crit_rating_bonus: 0.05 // +5% crit rating
        },
        icon: assetRegistry.buffs.onyxia, // Onyxia buff icon
        color: "#FF4500",
        rarity: "legendary",
        cooldown: 1800, // 30 seconds at 60fps
        manaCost: 0,
        castTime: 0,
        category: "movement",
        key: "Q"
    },
    {
        id: "zandalari",
        name: "Zandalari",
        type: "buff", 
        description: "Slows down projectiles and items, increases point multiplier, activates reverse gravity, and grants dodge bonus on expiration",
        duration: 600, // 10 seconds at 60fps
        effects: {
            slow_projectiles: 0.5, // 50% speed
            slow_items: 0.5, // 50% speed for items too
            point_multiplier: 2.0,
            reverse_gravity: true, // Activate reverse gravity effect
            // dodge_rating_bonus: 0.05 // +5% dodge rating - REMOVED: now applies as aftereffect
        },
        icon: assetRegistry.buffs.zgBuff1, // Zandalari buff icon
        color: "#FFD700",
        rarity: "epic",
        cooldown: 2700, // 45 seconds at 60fps
        manaCost: 0,
        castTime: 0,
        category: "enhancement",
        key: "W"
    },
    {
        id: "flask_of_titans",
        name: "Flask of Titans",
        type: "instant",
        description: "Removes one missed dragonstalker item, potentially making victory possible again", 
        duration: 0, // Instant effect
        effects: {
            restore_missed_item: true
        },
        icon: assetRegistry.buffs.flaskOfTitans, // Flask of Titans buff icon
        color: "#FF69B4",
        rarity: "rare",
        cooldown: 7200, // 2 minutes (120 seconds) at 60fps
        manaCost: 25,
        castTime: 60, // 1 second
        category: "utility",
        key: "E"
    },
    {
        id: "autoshot",
        name: "Autoshot",
        type: "instant",
        description: "Fires a single arrow straight up at high speed (0.5s cooldown)",
        duration: 0, // Instant effect
        effects: {
            fire_arrow: {
                count: 1,
                angles: [-90], // Straight up
                crit_bonus: 0 // No additional crit bonus
            }
        },
        icon: assetRegistry.buffs.autoshot, // New autoshot icon
        color: "#FFD700",
        rarity: "common",
        cooldown: 30, // 0.5 second cooldown (30 frames at 60fps)
        manaCost: 0,
        castTime: 0,
        category: "combat",
        key: "A",
        ammoRequired: 1 // Requires 1 arrow
    },
    {
        id: "multishot",
        name: "Multishot",
        type: "instant",
        description: "Fires 3 arrows in a spread pattern with +5% crit chance",
        duration: 0, // Instant effect
        effects: {
            fire_arrow: {
                count: 3,
                angles: [-65, -90, -135], // Left, center, right spread
                crit_bonus: 0.05 // +5% crit chance
            }
        },
        icon: assetRegistry.buffs.multishot, // New multishot icon
        color: "#FF6B35",
        rarity: "uncommon",
        cooldown: 120, // 2 seconds at 60fps
        manaCost: 0,
        castTime: 0,
        category: "combat",
        key: "R",
        ammoRequired: 3 // Requires 3 arrows (one per shot)
    }
]; 