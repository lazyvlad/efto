import { serverConfig } from './serverConfig.js';
import { applySettings } from '../utils/applySettings.js';

// Cache busting configuration
export const cacheConfig = {
    // Enable aggressive cache busting for mobile devices
    enableCacheBusting: true,
    
    // Version-based cache busting (increment version to force refresh)
    useVersionedUrls: true,
    
    // Timestamp-based cache busting (always forces refresh)
    useTimestampUrls: false, // Set to true for development, false for production
    
    // Cache control settings
    cacheControl: {
        // How long browsers should cache assets (in seconds)
        maxAge: 300, // 5 minutes for production
        
        // Force revalidation with server
        mustRevalidate: true,
        
        // Disable caching entirely for HTML files
        noCache: ['html', 'json']
    }
};

// ===== GAME CONFIGURATION OBJECT =====
// 🎮 Modify these values to customize your game experience!
// 
// QUICK EXAMPLES:
// - Change baseMinSpawnInterval to 5 for more frequent base power-ups (every 5-15 seconds at level 1)
// - Change levelScaling to 0.9 for slower scaling (10% faster per level instead of 15%)
// - Change minAbsoluteInterval to 1 for faster high-level spawning (minimum 1 second)
// - Increase maxPowerUps to 3 for more power-ups on screen
// - Disable power-ups entirely with enabled: false
export const gameConfig = {
    // === CANVAS SETTINGS ===
    canvas: {
        // Device-specific canvas dimensions for consistent gameplay experience
        // All scaling is based on playable area (bottom 30% for player movement)
        
        desktop: {
            width: 1600,            // Desktop canvas width (16:9 aspect ratio)
            height: 900,            // Desktop canvas height (16:9 aspect ratio)
            aspectRatio: 1600/900,  // True 16:9 aspect ratio (1.778)
            playableWidth: 1600,    // Full width is playable
            playableHeight: 900 * 0.3, // Bottom 30% for player movement (270px)
        },
        
        tablet: {
            width: 1024,            // Tablet canvas width
            height: 768,            // Tablet canvas height (4:3 aspect ratio)
            aspectRatio: 4/3,       // Classic 4:3 aspect ratio
            playableWidth: 1024,    // Full width is playable
            playableHeight: 768 * 0.3, // Bottom 30% for player movement (230px)
        },
        
        mobile: {
            width: 360,             // Conservative phone width - guaranteed to fit
            height: 'dynamic',      // ✅ FIXED: Dynamic height based on viewport
            aspectRatio: 360/600,   // Updated aspect ratio based on typical mobile space (0.6)
            playableWidth: 360,     // Full width is playable
            playableHeight: 'dynamic', // ✅ FIXED: Dynamic calculation based on available space
            
            // Mobile-specific positioning and dynamic sizing
            positioning: {
                centerHorizontally: true,  // Center left/right
                centerVertically: false,   // Don't center vertically
                bottomOffset: 10,          // Pixels kept clear under the field. The spell buttons stand on the field's edges, so nothing needs room there
                topOffset: 125,            // Pixels from top (below both panels: 8px + 115px + 2px gap)
                useCustomPositioning: true, // Enable mobile-specific positioning
                
                sideMargin: 4,             // Pixels kept clear left and right of the field, for its frame
                maxDisplayScale: 2,        // The field is never drawn more than this many times its own width (a small tablet)

                // Dynamic sizing parameters
                minHeight: 400,            // Minimum canvas height for very small screens
                maxHeight: 900,            // Maximum canvas height
                playableHeightPercent: 0.6, // 60% of available space for playable area
                safeAreaMargin: 6          // Extra margin for safety
            }
        },
        
        // Device detection thresholds - Touch-first approach
        deviceDetection: {
            // Primary: Touch capability detection
            touchFirst: true,       // Prioritize touch detection over screen size
            
            // Secondary: Size thresholds for touch devices
            mobileMaxWidth: 1024,   // Touch devices <= 1024px width are mobile (updated for modern devices)
            tabletMaxWidth: 1366,   // Touch devices <= 1366px width are tablet
            // Anything larger with touch is tablet, without touch is desktop
            
            // Touch device detection
            mobileUserAgents: ['Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'IEMobile', 'Opera Mini'],
            tabletMinDiagonal: 7,   // Minimum diagonal inches for tablet classification
        },
        
        // Scaling behavior
        scaling: {
            enabled: true,          // Enable intelligent scaling to fit different screen sizes
            maintainAspectRatio: true, // Always maintain the target aspect ratio
            scaleToFit: true,       // Scale canvas to fit screen while maintaining aspect ratio
            centerCanvas: true,     // Center the canvas on the screen
            
            // Playable area based scaling (THE KING 👑)
            usePlayableAreaScaling: true, // Base all item/UI scaling on playable area dimensions
            basePlayableArea: {     // Reference playable area for scaling calculations
                width: 1600,        // Desktop playable width (reference)
                height: 270,        // Desktop playable height (900 * 0.3)
            },
            
            // Letterboxing/Pillarboxing settings
            letterboxColor: '#000000', // Color for letterbox bars (black)
            showLetterboxInfo: false,  // Show debug info about letterboxing
        },
        
        // High-DPI display support
        highDPI: {
            enabled: true,          // Enable high-DPI support for crisp rendering
            maxPixelRatio: 2,       // Maximum device pixel ratio to use (prevents performance issues)
            autoDetect: true,       // Automatically detect device pixel ratio
        }
    },
    
    // === API SETTINGS ===
    // NOTE: API settings are now loaded from serverConfig.js
    // This allows easy modification on production servers without changing this file
    api: {
        basePath: serverConfig.basePath,
        endpoints: serverConfig.endpoints
    },
    
    // === POWER-UP SETTINGS ===
    powerUps: {
        enabled: true,
        maxPowerUps: 2,            // Maximum power-ups on screen at once
        baseMinSpawnInterval: 12,  // Base minimum seconds between power-up spawns (level 1)
        baseMaxSpawnInterval: 20,  // Base maximum seconds between power-up spawns (level 1)
        levelScaling: 0.90,        // Multiplier per level (0.90 = 10% faster each level)
        minAbsoluteInterval: 3,    // Absolute minimum spawn interval (prevents too frequent spawning)
        spawnChance: 1.0,          // 100% chance when timer triggers (deterministic timing)
        
        // Cut Time Power-up Settings
        cutTime: {
            enabled: true,
            speedReduction: 0.3,    // Reduce level speed by 0.3x each use (additive reduction)
            maxSpawns: 2,           // Maximum spawns per game
            minScoreForSpawn: 50,   // Minimum score before it can spawn
            spawnChance: 0.1,       // 10% chance when other conditions are met
        },
        
        // Freeze Time Power-up Settings (Power Word Shield)
        freezeTime: {
            enabled: true,
            duration: 120,          // Freeze duration in frames (120 = 2 seconds at 60fps)
            freezeAllProjectiles: true, // Freeze all damage projectiles
        },
    },
    
    // === NOTIFICATION SETTINGS ===
    notifications: {
        enabled: true,
        defaultDuration: 180,       // Default notification duration in frames (3 seconds at 60fps)
        fontSize: 18,               // Font size for notifications
        fadeOutPercent: 0.3,        // Start fading when 30% of time remains
        yOffset: 50,                // Distance from top of screen
        spacing: 50,                // Space between multiple notifications
    },
    
    // === AUDIO SETTINGS ===
    audio: {
        backgroundMusicStart: 30,   // Start background music at this many collections
        volumes: {
            background: 0.02,       // Background music volume (2%)
            effects: 0.7,           // Sound effects volume (70%)
            fireballImpact: 1.0     // Fireball impact volume (always max)
        }
    },
    
    // === GAMEPLAY SETTINGS ===
    gameplay: {
        maxFallingItems: 6,         // Maximum falling items on screen
        baseDropSpeed: 2,           // Base falling speed (pixels per frame at 60fps)
        itemSpawnChance: 0.01,      // Base chance per frame to spawn new item (reduced from 0.02)
        maxFireballs: 3,            // Maximum projectiles on screen
        healthLossOnMiss: 2,        // HP lost when missing an item (%)
        particleCount: 15,          // Number of particles per collection
        impactParticleCount: 30,    // Number of particles per fireball impact
        targetFPS: 60,              // Target FPS for speed calculations (normalizes speed across different frame rates)
        
        // Resolution and frame rate independence settings
        independence: {
            enabled: true,              // Enable resolution independence
            referenceWidth: 1920,       // Reference screen width for scaling calculations
            referenceHeight: 810,       // Reference screen height for scaling calculations
            scaleWithResolution: true,  // Scale speeds/sizes based on resolution
            minResolutionScale: 0.7,    // Minimum resolution scaling factor (increased from 0.5)
            maxResolutionScale: 1.3,    // Maximum resolution scaling factor (reduced from 2.0 for playability)
            normalizeToReference: true  // Normalize all measurements to reference resolution
        },
        
        // === FALL ANGLE SETTINGS ===
        fallAngles: {
            maxAngleVariation: 90,  // Maximum angle variation in degrees (-45 to +45 degrees)
            minAngle: -45,          // Minimum fall angle in degrees (negative = left)
            maxAngle: 45,           // Maximum fall angle in degrees (positive = right)
            allowUpwardMovement: true, // Allow angles > 90 degrees for upward movement
            upwardAngleMin: 135,    // Minimum upward angle (135° = up-left)
            upwardAngleMax: 225,    // Maximum upward angle (225° = up-right)
        },
    },
    
    // === PLAYER SETTINGS ===
    player: {
        startingHealth: 100,
        maxHealth: 100,
        moveSmoothing: 0.15,        // Movement smoothing factor (0.1 = slow, 0.3 = fast)
        mobileScale: 0.78,          // On a phone's narrow field the hunter is drawn this much smaller, to leave room to step aside
        
        // === MOVABLE AREA SETTINGS ===
        movableArea: {
            enabled: true,          // Enable movement constraints
            heightPercent: 0.3,     // Player can move in bottom 30% of canvas
            showBorder: true,       // Show visual border of movable area
            borderColor: '#e8c66a', // Border color (the interface's soft gold)
            borderOpacity: 0.3,     // Border opacity (30%)
            borderWidth: 2,         // Border line thickness
        }
    },
    
    // === LEVEL PROGRESSION ===
    // === LEVELLING ===
    // Catching items gives experience, and each level needs more of it than the last
    // (utils/progression.js). Levels are the ones the player sees: the first is 1.
    progression: {
        // The pace is set in seconds: a player who catches most things spends about
        // secondsAtLevel1 on level 1 and secondsPerLevel more on every level after that
        // (level 5: 22s, level 10: 37s, level 20: 67s).
        secondsAtLevel1: 10,
        secondsPerLevel: 3,
        xpPerSecond: 1.2,           // Experience such a player earns per second from level 1 items
        
        // Items are worth this much more per level, in points and in experience (0.12 = +12%).
        // Without it the later levels would take longer and longer for the same catches.
        valueGrowthPerLevel: 0.12,
        
        // The level at which each rarity starts to drop. The server holds the rare ones back
        // by time as well (not_before_seconds in config/loot.php on the site).
        unlockLevel: {
            regular: 1,
            green: 2,
            epic: 4,
            special: 6,
            set_piece: 3,               // The first set; each set has its own level under "sets" below
            legendary: 10,
            zee_zgnan: 12,
        },
    },
    
    // === BOSS FIGHTS ===
    // Who the bosses are is in data/bosses.js. A boss's strength comes from its zone (1 to 10)
    // and the numbers here: "base" is the first zone's boss, "perZone" what each later zone
    // adds or takes off. 60 steps = 1 second.
    // === VOICE LINES ===
    // The guild's own voices, said at moments in the game (data/voiceLines.js says which clip
    // at which moment; systems/voiceSystem.js plays them). One at a time, with a pause between.
    voice: {
        volume: 1,                  // Against the other sound effects (0 to 1)
        pause: 6,                   // Seconds of quiet after a line before another may begin
        explicit: true,             // Whether the clips with swearing in them are played
        banterEvery: { least: 50, most: 110 },  // Seconds between remarks made for no reason
        lowHealth: 0.25,            // The share of health below which someone calls for a healer
        heavyBlow: 14,              // Health lost in one step that counts as a heavy blow
    },

    // === THE PET ===
    // Every hunter has a pet (data/pets.js has one for each side). It keeps busy: every so
    // often it fetches one item he is not going to reach (a fetched item counts as caught),
    // and in between it leaps at the things that would hurt him and bites them out of the
    // air, in a boss fight too. After each it rests a moment at his side.
    pet: {
        every: 1200,                // Steps from one fetched item to the next (20 seconds)
        rest: 150,                  // Steps it rests after fetching or biting something (2.5 seconds)
        leapHeight: 0.9,            // How high it can leap at a projectile, against the hunter's height
        voicedBiteEvery: 3,         // Every so many bites is the voiced one; the rest are a plain snap of jaws
        lookAgain: 30,              // Steps before it looks again when nothing was worth the run
        speed: 0.012,               // How fast it runs, as a share of the field's width per step
        height: 0.52,               // How tall it is drawn, against the hunter
        length: 0.8,                // The most room it takes lengthways, against the hunter's height
    },

    // === HUNTER SETS ===
    // Three armour sets, collected piece by piece over many games. A logged-in player keeps
    // every piece they catch on their account; a guest has only what this game gave them. Each
    // set drops from a level on (the site holds them back the same way: sets in
    // config/loot.php). The player picks which set to wear and may change it at any time, in
    // a fight too. What wearing one gives is set out under "THE HUNTER'S SETS" below.

    // === THE HUNTER'S BAGS ===
    // Everything caught goes into the bags (utils/bags.js). The site has the same numbers
    // ("bags" in config/loot.php) and the prices of the bags that can be bought.
    bags: {
        backpack: 16,               // Slots everyone has
        bagSlots: 4,                // Bags that can be added to the backpack
        stack: 20,                  // How many of one kind a slot holds
        fullPenalty: 0.1,           // With no room left, what is caught sells for this much less (0.1 = 90% of its worth)
        // Pieces of gear the hunter takes into a game, what is worn among them. The rest of
        // what is owned stays in the bank until the game is over ("carry" in config/gear.php).
        carry: 36,
    },

    // === THE HUNTER'S STATS ===
    // Health, armor and attack power (utils/stats.js). They come from the pieces owned of the
    // set being worn, below. A hunter with no pieces has the base health and no armor or
    // attack power.
    stats: {
        armorHalvesAt: 150,         // Armor that takes half off a hit: 50 armor takes a quarter, 150 half
        mostArmorReduction: 0.6,    // Armor never takes more than this share off a hit
    },

    // === THE HUNTER'S SETS ===
    // Each set is better than the one before. Wearing one gives two things:
    //   perPiece  for every piece of it owned: health, armor and attack power (1 attack power
    //             = 1% more arrow damage). A full Giantstalker: +24 health, 32 armor, 16 attack power.
    //   bonuses   at so many pieces, something of the set's own. The highest step reached is
    //             the one that counts, so each step names everything it gives:
    //               dodge, crit   added to the chance
    //               multishot     more damage from Multishot arrows (0.4 = +40%)
    //               arcane        more damage from Arcane Shot
    //               bossDamage    more damage from every arrow, against bosses
    sets: [
        {
            id: 'giantstalker', name: 'Giantstalker Armor', tier: 1, fromLevel: 3,
            perPiece: { health: 3, armor: 4, attackPower: 2 },
            bonuses: [{ pieces: 3, dodge: 0.02 }, { pieces: 5, dodge: 0.05 }, { pieces: 8, dodge: 0.05, multishot: 0.4 }],
        },
        {
            id: 'dragonstalker', name: 'Dragonstalker Armor', tier: 2, fromLevel: 9,
            perPiece: { health: 4, armor: 6, attackPower: 4 },
            bonuses: [{ pieces: 3, crit: 0.02 }, { pieces: 5, crit: 0.05 }, { pieces: 8, crit: 0.05, arcane: 0.5 }],
        },
        {
            id: 'cryptstalker', name: 'Cryptstalker Armor', tier: 3, fromLevel: 15,
            perPiece: { health: 5, armor: 8, attackPower: 6 },
            bonuses: [{ pieces: 2, bossDamage: 0.05 }, { pieces: 4, bossDamage: 0.1 }, { pieces: 6, bossDamage: 0.15 }, { pieces: 8, bossDamage: 0.2 }],
        },
    ],

    // === BOSS RUSH ===
    // A game of nothing but the bosses of one side, back to back: no items, no stray
    // projectiles. For logged-in players, who pay coins to enter (rush in config/boss_loot.php
    // on the site). Between two bosses there is a breather, with something dropped to restock.
    bossRush: {
        breather: 240,              // Steps between one boss falling and the next coming in
        supplies: ['thorium_arrows', 'health_potion'],  // Dropped in the breather (data/powerUpItems.js)
    },

    // === QUIVER ===
    // How many arrows the hunter can carry: so many slots of so many arrows. A game starts with
    // some slots filled, and arrows caught beyond what the quiver holds are lost. A logged-in
    // player who has found the large quiver (a boss drop, kept on the account) has more slots.
    quiver: {
        slotSize: 50,               // Arrows to a slot
        slots: 4,                   // Slots everyone has: 200 arrows
        startFilled: 2,             // Slots filled when a game starts: 100 arrows
        bonusSlots: 4,              // Slots the large quiver adds: 400 arrows in all
    },

    // === COINS ===
    // What catching an item is worth, by rarity, in copper (100 copper = 1 silver, 100 silver =
    // 1 gold). A logged-in player's coins are kept on their account. The site works out what a
    // game earned from its own copy of these (coins in config/loot.php): keep the two the same.
    coins: {
        byType: {
            regular: 10,
            green: 25,
            epic: 100,
            special: 150,
            set_piece: 200,
            legendary: 500,
            zee_zgnan: 1000,
        },
        bossPerZone: 100,           // Defeating a boss pays this for each zone it guards
    },

    bosses: {
        health: { base: 240, perZone: 257 },                    // Hogger (zone 2): 497. The first bosses go down quickly; the last has about 2550
        // The warriors' armor ("warrior" in data/bosses.js): Hogger (zone 2) 36, arrows do 19%
        // less; Chief Ukorz (zone 10) 84, 36% less. Arcane Shot goes through it.
        armor: { base: 30, perZone: 6 },
        // How big a boss is drawn: as tall as this share of the field's height, but never wider
        // than a share of its width. On a field taller than it is wide (a phone held upright) it
        // is as tall as the hunter times vsHunterOnNarrowField, so it has room to move about
        // and is not hit by every shot.
        size: { height: 0.3, width: 0.6, vsHunterOnNarrowField: 1.12 },
        damage: { base: 8, perZone: 0.8 },                      // What one of the boss's attacks takes off the player: 8 for the first boss, about 15 for the last
        throwEvery: { base: 75, perZone: 5, fastest: 45 },      // Steps on the move between one attack and winding up the next
        volleyEvery: { base: 450, perZone: 15, fastest: 300 },  // Steps between rows with one gap, which every boss sends down on top of its own attacks
        
        // Arrows
        arrowDamage: 10,            // Damage of one arrow, before crits and weakening
        arcaneDamage: 3,            // An Arcane Shot does this many arrows' worth (it costs 5)
        
        // The longer a fight lasts the weaker the boss gets, up to a limit
        weakenPerSecond: 0.02,      // Each second, arrows do this much more damage (0.02 = +2%)
        maxWeakened: 2,             // Arrows never do more than this many times their normal damage
        
        // Waiting for the boss to weaken has its price: the weaker it gets, the more frantically
        // it fights. Fully weakened it attacks (1 + this) times as often as at the start: the
        // first boss 1.6 times, the fifth 2.2 times, the last 3 times. Its wind-ups stay as
        // they are, so every attack can still be seen coming.
        frenzy: { base: 0.6, perZone: 0.15, most: 2 },
        
        // The boss shields itself: arrows are absorbed until an Arcane Shot breaks the shield
        shield: {
            fromZone: 2,            // The first zone whose boss shields itself
            firstAfter: 12,         // Seconds into the fight of the first shield
            every: 30,              // Seconds from a shield being broken to the next one
            perZone: 1.5,           // Shorter by this much with every zone
            shortest: 15,
        },
        
        // When its time is up the boss enrages: it throws faster and hits harder
        enrage: {
            after: 100,             // Seconds the first boss gives the player
            perZone: 5,             // Less by this much with every zone
            soonest: 50,
            atStart: 1.5,           // Times faster and harder the moment it enrages
            perSecond: 0.03,        // Growing by this much every second after
            most: 4,                // Never more than this
        },
        
        reward: { score: 100, scorePerZone: 50, health: 10 },   // Health comes back sparingly: a fight should still be felt in the next zone
        
        // A boss keeps on the move: it sweeps along the top and is drawn towards the player,
        // so it passes over them without ever settling there
        movement: {
            speed: 0.004,           // Fastest it moves, as a share of the screen width per step
            sweep: { base: 15, perZone: 0.8, fastest: 8 },  // Seconds for one sweep across and back: slow for the first boss, quicker by the zone
            towardsPlayer: 0.35,    // How far it is drawn off its sweep towards the player (0 = not at all, 1 = sits over them)
        },
        
        // A boss sidesteps arrows it sees coming, the later bosses more sharply. It cannot while
        // it winds up an attack, while shielded, or while already busy.
        dodge: {
            reaction: { base: 20, perZone: 1.5, fastest: 6 },   // Steps it takes to react to an arrow
            cooldown: { base: 100, perZone: 8, shortest: 28 },  // Steps before it can sidestep again
            seesAhead: 45,          // It notices arrows this many steps before they would land
            steps: 14,              // A sidestep lasts this long
            distance: 0.8,          // ...and carries it this far, in widths of its own body
            // The nimble bosses ("nimble" in data/bosses.js) also have a chance that an arrow
            // misses them: Garrick (zone 1) 5%, King Bangalash (zone 9) 13%. Not Arcane Shot.
            chance: { base: 0.05, perZone: 0.01 },
        },
        
        // Later bosses wind up faster: each zone takes this share off the wind-up, down to the
        // least it may be. A charge or a stomp, which the player has to get clear of, keeps more.
        windUp: { perZone: 0.05, least: 0.5, leastForHeavy: 0.7 },
        
        // Standing right under a boss is not safe. A player who stays within its reach gets a
        // swipe: it is wound up like any attack, so there is a moment to get out, and it comes
        // on top of the boss's own round of attacks. Rushing in to shoot from close up is still
        // worth it, but only for as long as the swipe takes to come.
        melee: {
            reach: 0.9,             // How far below the boss it reaches, in heights of its body
            patience: 45,           // Steps a player may stay that close before it winds up
            damage: 2,              // The swipe does this many times the boss's damage
        },

        // The last boss of each side has a storm of its own (Rain of Fire, Blizzard: "storm" in
        // data/bosses.js). Below this share of its health it calls the storm down over the half
        // of the field the player stands in: the ground is marked first, so there is time to
        // cross to the other half, and then it comes down for a while, hurting whoever is in it.
        storm: {
            belowHealth: 0.5,       // The boss's health at which the storms begin
            every: 600,             // Steps from the end of one storm to the next
            warning: 75,            // Steps the ground is marked before it comes down
            lasts: 240,             // Steps it comes down for
            hitEvery: 30,           // Steps between one hit and the next on a player standing in it
            damage: 0.6,            // Each hit does this many times the boss's damage
        },

        // A riot (Bazil Thredd): the boss calls on the mob, and for a while stones come flying in
        // from both sides of the field, on top of whatever the boss itself is doing. They can
        // be shot down or stepped around like anything else thrown.
        riot: {
            stones: 8,              // How many are thrown in one riot
            every: 26,              // Steps from one stone to the next
            image: 'assets/attacks/alliance/08-fozruk-boulder.webp',
            size: 0.8,              // Against the standard projectile
            spin: 0.14,
            lean: 0.75,             // How fast a stone moves sideways, against how fast it falls
            from: { top: 0.28, bottom: 0.5 },   // The height at the field's edge stones come in at, as shares of the field's height
            damage: 0.7,            // A stone does this many times the boss's damage
        },

        // Attacks that are more than a thrown thing hit harder: a charge, a blast, a stomp
        heavyDamage: 1.5,
        // A curse takes this share of the boss's damage every second, for this many seconds
        curse: { share: 0.25, seconds: 6 },

        arrowBundle: 'bronze_arrows', // The arrow bundle dropped during a fight (data/powerUpItems.js)
        arrowsEvery: 300,           // Steps between arrow bundles
        potionEvery: 1200,          // Steps between health potions
        
        // In normal play, the chance per step that one of the bosses' attacks falls as a hazard
        // (any boss of either side, picked at random)
        bossAttackChance: 0.006,
    },
    
    // === BACKGROUNDS ===
    // The pictures themselves are listed per side in data/backgrounds.js
    backgrounds: {
        levelsPerBackground: 2,     // Levels in a zone: played on one background, with the zone's boss at the end
        whenFinished: 'loop',       // After the side's last background: 'loop' starts again, 'hold' stays on it
    },
    
    levels: {
        // === TESTING CONFIGURATION ===
        startingLevel: 1,                  // Starting level for testing (1 = normal 1.6x, 10 = ~4.3x speed, 15 = ~6.3x speed)
        
        // === HYBRID TIME + ACTIVITY PROGRESSION ===
        progressionType: "xp",              // "xp" (experience, see progression above); "hybrid", "time" and "points" are the older systems
        baseTimePerLevel: 35,               // Base time requirement per level (seconds)
        
        // Activity bonuses/penalties
        activityBonus: {
            collectionsReduce: 3,           // Each collection reduces time by 3 seconds (increased from 2)
            missesIncrease: 1,              // Each miss increases time by 1 second
            maxReduction: 20,               // Max time reduction per level (67% faster, increased from 15)
            maxIncrease: 8,                 // Max time increase per level (27% slower, reduced from 10)
            powerUpCollectedReduce: 4,      // Power-up collection reduces time by 4 seconds (increased from 3)
            damageReceivedIncrease: 0.3     // Each damage point increases time by 0.3 seconds (reduced from 0.5)
        },
        
        // Mathematical formula for speed progression (balanced)
        formulaBase: 1.2,           // Starting speed at level 0
        maxLevelSpeedMultiplier: 22.0,    // Maximum level speed multiplier (aggressive progression to 22X)
        
        // === UNLIMITED PROGRESSION SETTINGS ===
        enableSafetyCap: true,      // Enable safety cap to prevent extreme performance issues
        safetyCap: 22.0,            // Maximum speed multiplier (22x) - aggressive progression cap
        
        // Formula tuning parameters
        formulaWeights: {
            linear: 0.3,            // Linear component weight (increased for steady growth)
            quadratic: 0.1,         // Quadratic component weight (increased for smoother acceleration)
            exponential: 0.2,       // Exponential component weight (reduced for slower late-game explosion)
            exponentialBase: 1.1    // Base for exponential component (reduced for more gradual growth)
        },
        
        // Points-based level thresholds (more gradual progression)
        thresholds: [0, 30, 80, 150, 240, 350, 480, 630, 800, 1000, 1220, 1460, 1720, 2000, 2300, 2620, 2960, 3320, 3700, 4100],
    },
    
    // === DRAGONSTALKER SET COMPLETION ===
    dragonstalker: {
        speedReductionPercent: 0.15,    // 15% speed reduction per completion (reduced from 30% to preserve bullet time access)
        minSpeedAfterReduction: 0.2,    // Minimum speed multiplier after all reductions
        enableMultipleCompletions: true, // Allow collecting sets multiple times
        maxSpeedReduction: 2.0,         // Cap total speed reduction to preserve bullet time access (22x - 2x = 20x minimum)
        preserveBulletTimeAccess: true  // Ensure players can still reach bullet time trigger speed
    },
    
    // === BULLET TIME SYSTEM ===
    bulletTime: {
        enabled: true,                  // Enable bullet time at high speeds
        triggerSpeed: 20.0,             // Speed at which bullet time activates (20x)
        timeDilation: 0.85,             // Time moves at 85% normal speed during bullet time (less effect)
        visualEffects: {
            enabled: true,              // Enable visual effects during bullet time
            borderGlow: true,           // Add pulsating border glow only
            glowColor: '#4DA6FF',       // Blue border color
            glowIntensity: 0.6,         // Border glow intensity
            pulseSpeed: 0.15,           // How fast the border pulses
            focusIndicator: true,       // Show "FOCUS MODE" indicator
            screenTint: false,          // Disable screen tint
            edgeGlow: false,            // Disable edge glow effects
            particleTrails: false       // Disable enhanced particle trails
        }
    },
    
    // === ITEM DROP PROBABILITIES ===
    itemProbabilities: {
        // Each item of a rarity has this weight, so a rarity with more items comes up more
        // often. When items are added, lower the weight to keep the rarity's share: these were
        // 0.4, 0.2 and 0.1 when there were 15 regular, 6 green and 5 epic items.
        regular: 0.3,               // 20 regular items
        green: 0.11,                // 11 green items
        epic: 0.067,                // 9 epic items
        set_piece: 0.024,           // Pieces of the three hunter sets, 25 of them; only the sets unlocked at the level drop
        special: 0.032,              // Special items base probability (3.2%)
        legendary: 0.02,            // Legendary items base probability (2%)
        zee_zgnan: 0.01,           // Zee Zgnan items base probability (1%) - Ultra rare, one-time only
    },
    
    // === VISUAL SETTINGS ===
    visuals: {
        itemSize: 80,              // Base size of falling items (multiplied by items.sizeByType for the item's rarity)
        powerUpItemSize: 120,       // Size of power-up items (width & height)
        playerWidth: 85,
        playerHeight: 165,
        playerSpeed: 12,                // Base player speed (will be scaled by resolution)
        minYSpacing: 250,           // Minimum spacing between falling objects
        forceItemAspectRatio: true, // Force square aspect ratio for all items
        // NOTE: Item sizes per rarity are set in items.sizeByType below
    },
    
    // === DEBUG SETTINGS ===
    debug: {
        logScalingConstraints: false,  // Log when images are constrained by AssetManager
        showAssetDimensions: false,    // Show original vs scaled dimensions in console
        logPerformanceMetrics: false,  // Log rendering performance metrics
    },
    
    // === UI POSITIONING & LAYOUT ===
    ui: {
        // Safe area margins to prevent UI elements from touching screen edges
        safeAreaMargin: 20,          // Minimum distance from viewport edges (pixels)
        panelMargin: 30,             // Extra margin for info panels (pixels)
        responsiveMargin: true,      // Scale margins with canvas scale factor
        
        // Panel positioning
        leftPanel: {
            marginLeft: 25,          // Left panel margin from game area edge
            marginTop: 20,           // Top margin for left panel
        },
        
        rightPanel: {
            marginRight: 25,         // Right panel margin from game area edge  
            marginTop: 20,           // Top margin for right panel
        }
    },
    
    // === ITEM RENDERING QUALITY ===
    items: {
        // High-DPI rendering settings
        highDPI: {
            enabled: true,           // Enable high-DPI item rendering
            multiplier: 1.0,         // Conservative scaling (1.0 = no extra scaling, just DPI awareness)
            minPixelSize: 32,        // Reduced minimum item size
            crispRendering: false,   // DISABLED: Pixel-perfect rendering causes tearing during rotation
        },
        
        // Image quality settings optimized for rotation
        imageQuality: {
            smoothing: true,         // Enable image smoothing (essential for rotation)
            quality: 'high',         // Image smoothing quality ('low', 'medium', 'high')
            sharpScaling: false,     // Use smooth scaling for rotation
        },
        
        // Size of each falling item as a multiple of the base item size, by rarity.
        // Every item of a rarity is the same size; nothing is sized per item.
        sizeByType: {
            regular: 0.85,
            green: 0.95,
            epic: 1.15,
            special: 1.15,
            set_piece: 1.15,
            legendary: 1.8,
            zee_zgnan: 1.4
        },
        
        // Every power-up is the same size: this multiple of the base power-up size
        powerUpSize: 1.2,
        // Phones: falling things keep the size they have next to the player on desktop. Raise the
        // boost above 1 to draw them larger on phones; nothing is ever drawn bigger than
        // mobileMaxSizeVsPlayer times the player's size.
        mobileSizeBoost: 1.0,
        mobileMaxSizeVsPlayer: 0.95,
        
        // Soft aura behind everything that isn't loot, so it reads at a glance:
        // helpful things (power-ups, beneficial spells) are greenish, harmful projectiles reddish
        aura: {
            enabled: true,
            helpfulColor: '#3dff6e',
            harmfulColor: '#ff3b30',
            radius: 1.15,            // Aura radius as a multiple of the object's size
            opacity: 1.0             // Peak opacity; it pulses gently below this
        },
        
        // Long, thin artwork (swords, crossbows: at least twice as long as wide) is drawn this
        // much larger so it doesn't read as a sliver next to square icons of the same rarity
        thinArtBoost: 1.35,
        
        // Size constraints
        sizing: {
            respectMinimumSize: false, // Don't enforce minimum sizes to avoid over-scaling
            scaleWithDPI: false,      // Disable DPI scaling to keep original sizes
            maintainAspectRatio: true, // Always maintain original aspect ratios
        }
    },
};

// Settings changed in the site's admin section come with the page. They are laid over the
// ones above here, before anything else in the game has read them.
applySettings(gameConfig, globalThis.INPUT_BOOT?.settings);

// High Scores System Configuration
export const HIGH_SCORES_KEY = 'dmtribut_high_scores';
export const MAX_HIGH_SCORES = 100; 