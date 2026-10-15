<?php

/*
|--------------------------------------------------------------------------
| Gear that is not a piece of a hunter set
|--------------------------------------------------------------------------
|
| Two kinds of thing can be worn besides the sets (App\Support\Gear):
|
|   What the bosses drop (config/boss_loot.php). "boss_slots" says where each is worn. What
|   it gives is worked out from where it is worn, how rare it is and how far into the game
|   its boss stands ("budget" below), so a later boss's plain item can beat an early boss's
|   best. Rare (blue) items, and epic trinkets, also help with carrying: each point takes
|   one hundredth off what is lost on things caught when the bags are full.
|
|   The weapons and jewellery that fall in a game ("drops"). Each says where it is worn and
|   what it gives. These are no longer sold when the game ends: they are kept, to wear or to
|   sell later.
|
| Slots are named as the game names them (WORN_IN in game/utils/gear.js): head, neck,
| shoulders, back, chest, shirt, tabard, bracers, hands, belt, legs, boots, ring, trinket,
| mainhand, offhand, ranged. The game is handed this catalogue with its page.
|
| Stats: health, armor, attackPower (1 = 1% more arrow damage), crit and dodge (percentage
| points), carrying (percentage points off the full-bag loss).
|
*/

return [

    /*
     * How many pieces of gear a hunter takes into a game. Everything else a player owns
     * stays in the bank, and cannot be put on until the game is over. What is being worn
     * counts. gameConfig.bags.carry in the game is the same number.
     */
    'carry' => 36,


    'boss_slots' => [
        // Alliance
        'garricks-red-bandana' => 'head', 'padfoots-throwing-dagger' => 'ranged', 'garricks-head' => 'trinket',
        'hoggers-chewed-collar' => 'neck', 'huge-gnoll-claw' => 'trinket', 'hoggers-trophy-axe' => 'mainhand',
        'stockade-shiv' => 'offhand', 'thredds-prison-key' => 'trinket', 'head-of-bazil-thredd' => 'trinket',
        'blackened-defias-belt' => 'belt', 'cape-of-the-brotherhood' => 'back', 'cruel-barb' => 'mainhand',
        'blackrock-tabard' => 'tabard', 'gathilzoggs-war-axe' => 'mainhand', 'head-of-gathilzogg' => 'trinket',
        'stitches-femur' => 'offhand', 'abominations-hook' => 'mainhand', 'embalmers-cleaver' => 'mainhand',
        'dragonmaw-shinbone' => 'offhand', 'nekroshs-spiked-mace' => 'mainhand', 'nekroshs-head' => 'trinket',
        'chunk-of-fozruk' => 'trinket', 'rod-of-order' => 'offhand', 'heart-of-the-mountain-giant' => 'trinket',
        'white-tiger-pelt' => 'back', 'bangalashs-fang' => 'neck', 'head-of-bangalash' => 'trinket',
        'atalai-tablet' => 'trinket', 'hexxs-voodoo-mask' => 'head', 'vilebranch-soul-dagger' => 'mainhand',
        // Horde
        'scorpid-stinger' => 'offhand', 'sarkoths-mangled-claw' => 'trinket', 'venom-etched-carapace' => 'chest',
        'darkspear-voodoo-charm' => 'neck', 'zalazanes-witch-doctor-mask' => 'head', 'zalazanes-head' => 'trinket',
        'subterranean-cape' => 'back', 'cursed-felblade' => 'mainhand', 'heart-of-taragaman' => 'trinket',
        'white-lion-fang' => 'neck', 'horn-of-echeyakee' => 'trinket', 'echeyakees-hide' => 'back',
        'venture-co-blueprints' => 'trinket', 'wrenchwhistles-spanner' => 'offhand', 'gerenzos-mechanical-arm' => 'hands',
        'shadow-panther-fang' => 'neck', 'ashenvale-shadow-pelt' => 'back', 'shadumbras-head' => 'trinket',
        'grimtotem-war-totem' => 'offhand', 'grimtotem-battle-harness' => 'chest', 'arnaks-hoof' => 'trinket',
        'thick-bear-fur' => 'shirt', 'samras-claw' => 'trinket', 'hide-of-big-samras' => 'back',
        'kolkar-bracers' => 'bracers', 'centaur-war-spear' => 'ranged', 'khan-dezhepahs-head' => 'trinket',
        'big-bad-pauldrons' => 'shoulders', 'ripsaw' => 'mainhand', 'jangthraze-the-protector' => 'mainhand',
    ],

    /*
     * Item levels, as World of Warcraft has them: what a piece of gear gives comes from its
     * item level and the kind of slot it is worn in, never from its rarity, so two items of
     * the same level and kind are as strong as each other. A boss's item is of its zone's
     * level, one step up for each step of rarity: a zone's green, the zone before's blue and
     * the one before that's purple are all of a level. What falls in a game, and what is
     * made, says its level ("item_level" below and under "crafted").
     */
    'item_levels' => [
        'first_zone' => 10,         // The first zone's green
        'per_zone' => 5,            // Each zone further in, and each step of rarity
        'rarity_steps' => ['common' => -1, 'uncommon' => 0, 'rare' => 1, 'epic' => 2],
        // The clothes the hunters start in (their stats are their own)
        'starter' => 5,
        // Stat points an item has for each item level, by the kind of slot it is worn in
        'points_per_level' => ['weapon' => 0.2, 'armor' => 0.25, 'jewelry' => 0.2],
        // What a point of each stat costs
        'cost' => ['attackPower' => 1, 'armor' => 0.5, 'health' => 0.5, 'crit' => 3, 'dodge' => 3, 'carrying' => 0.5],
        // How each kind spends its points, as shares, unless the item says otherwise ("mix")
        'mix' => [
            'weapon' => ['attackPower' => 1],
            'armor' => ['armor' => 0.6, 'health' => 0.4],
            'jewelry' => ['health' => 0.5, 'attackPower' => 0.5],
            'trinket' => ['health' => 0.4, 'attackPower' => 0.4, 'carrying' => 0.2],
        ],
        // A weapon of this level or more spends 3 of its points on +1% crit
        'weapon_crit_from' => 40,
    ],

    // What a boss's item sells for, in copper, for each zone its boss guards
    'boss_value_per_zone' => ['uncommon' => 100, 'rare' => 300, 'epic' => 1000],

    // The weapons and jewellery that fall in a game. They sell for what their rarity paid
    // when they were sold on the spot ("coins" in config/loot.php).
    /*
     * Weapons held in both hands: while one is worn nothing can be held in the off hand. To be
     * worth that, a boss's two-handed weapon gives this many times what a one-handed weapon of
     * its rarity and zone gives; the two that fall in a game say what they give below.
     */
    'two_handed' => ['hoggers-trophy-axe', 'gathilzoggs-war-axe', 'ashkandi2', 'crulshorukh', 'walking-stick'],
    'two_handed_factor' => 1.7,

    // Gear that is made (config/crafting.php), not found: the hunter's for good once made, one
    // of each. "effect" is what it does besides its stats, in the game (gameConfig.js).
    'crafted' => [
        'thunderfury' => [
            'name' => 'Thunderfury, Blessed Blade of the Windseeker',
            'slot' => 'mainhand',
            'rarity' => 'legendary',
            'item_level' => 80,
            'effect' => 'chain-lightning',
        ],
    ],

    'drops' => [
        // Their item level, and how they spend it where they differ from their kind ("mix")
        'ashkandi2' => ['slot' => 'mainhand', 'item_level' => 55],
        'crulshorukh' => ['slot' => 'mainhand', 'item_level' => 50],
        'brutality_blade' => ['slot' => 'mainhand', 'item_level' => 45],
        'maladath' => ['slot' => 'mainhand', 'item_level' => 45, 'mix' => ['attackPower' => 0.7, 'dodge' => 0.3]],
        'dalrends' => ['slot' => 'offhand', 'item_level' => 45],
        'ashjrethul' => ['slot' => 'ranged', 'item_level' => 55],
        'quick-strike-ring' => ['slot' => 'ring', 'item_level' => 40, 'mix' => ['attackPower' => 0.6, 'crit' => 0.4]],
        'circle-of-applied-force' => ['slot' => 'ring', 'item_level' => 40],
        'drakefangtalisman' => ['slot' => 'trinket', 'item_level' => 50, 'mix' => ['attackPower' => 0.5, 'dodge' => 0.3, 'carrying' => 0.2]],
        'onslaught' => ['slot' => 'belt', 'item_level' => 45, 'mix' => ['attackPower' => 0.5, 'health' => 0.5]],
        // The plain things that fall often, kept and worn since the hunters are drawn wearing
        // them: a few capes, a walking stick held in both hands, two simple rings
        'miners-cape' => ['slot' => 'back', 'rarity' => 'common', 'item_level' => 6, 'mix' => ['armor' => 1]],
        'wolf-master' => ['slot' => 'back', 'rarity' => 'common', 'item_level' => 8],
        'cape21' => ['slot' => 'back', 'rarity' => 'common', 'item_level' => 8, 'mix' => ['armor' => 1]],
        'cape05' => ['slot' => 'back', 'rarity' => 'common', 'item_level' => 8],
        'walking-stick' => ['slot' => 'mainhand', 'rarity' => 'common', 'item_level' => 8],
        'ring1' => ['slot' => 'ring', 'rarity' => 'common', 'item_level' => 8, 'mix' => ['health' => 1]],
        'ring2' => ['slot' => 'ring', 'rarity' => 'common', 'item_level' => 8, 'mix' => ['armor' => 1]],
    ],

    /*
     * The clothes each hunter starts in: gear like any other, worn slot by slot, taken off and
     * replaced by better things. Every account (and every guest) has both sets, once; they
     * are never sold and never count towards what a hunter carries. Each side's hunter starts
     * in its own (game/data/hunterArt.js draws them). By the sheet's slot.
     */
    'starter' => [
        'alliance' => [
            'chest' => ['id' => 'starter-alliance-pajama-top', 'name' => 'Pajama Hunter Top', 'slot' => 'chest', 'stats' => ['armor' => 1]],
            'legs' => ['id' => 'starter-alliance-pajama-legs', 'name' => 'Pajama Hunter Trousers', 'slot' => 'legs', 'stats' => ['armor' => 1]],
            'feet' => ['id' => 'starter-alliance-leather-boots', 'name' => 'Pajama Hunter Leather Boots', 'slot' => 'boots', 'stats' => ['armor' => 1]],
            'waist' => ['id' => 'starter-alliance-leather-belt', 'name' => 'Pajama Hunter Leather Belt', 'slot' => 'belt', 'stats' => ['armor' => 1]],
            'wrist' => ['id' => 'starter-alliance-bracers', 'name' => 'Pajama Hunter Bracers', 'slot' => 'bracers', 'stats' => ['armor' => 1]],
            'hands' => ['id' => 'starter-alliance-grips', 'name' => 'Pajama Hunter Leather Grips', 'slot' => 'hands', 'stats' => ['armor' => 1]],
            'quiver' => ['id' => 'starter-alliance-quiver', 'name' => 'Pajama Hunter Quiver and Harness', 'slot' => 'quiver', 'stats' => ['health' => 1]],
            'tabard' => ['id' => 'starter-alliance-tabard', 'name' => 'Pajama Hunter Tabard', 'slot' => 'tabard', 'stats' => ['health' => 1]],
            'ranged' => ['id' => 'starter-alliance-bow', 'name' => 'Pajama Hunter Bow', 'slot' => 'ranged', 'stats' => ['attackPower' => 1]],
        ],
        'horde' => [
            'neck' => ['id' => 'starter-horde-bone-amulet', 'name' => 'Horde Hunter Bone Amulet', 'slot' => 'neck', 'stats' => ['health' => 1]],
            'shoulder' => ['id' => 'starter-horde-mantle', 'name' => 'Horde Hunter Shoulder Mantle', 'slot' => 'shoulders', 'stats' => ['armor' => 1]],
            'chest' => ['id' => 'starter-horde-leather-vest', 'name' => 'Horde Hunter Leather Vest', 'slot' => 'chest', 'stats' => ['armor' => 1]],
            'wrist' => ['id' => 'starter-horde-bracers', 'name' => 'Horde Hunter Bracers', 'slot' => 'bracers', 'stats' => ['armor' => 1]],
            'hands' => ['id' => 'starter-horde-grips', 'name' => 'Horde Hunter Fingerless Grips', 'slot' => 'hands', 'stats' => ['armor' => 1]],
            'waist' => ['id' => 'starter-horde-belt', 'name' => 'Horde Hunter War Belt', 'slot' => 'belt', 'stats' => ['armor' => 1]],
            'legs' => ['id' => 'starter-horde-leather-legs', 'name' => 'Horde Hunter Leather Leggings', 'slot' => 'legs', 'stats' => ['armor' => 1]],
            'feet' => ['id' => 'starter-horde-hoofguards', 'name' => 'Horde Hunter Hoof Guards', 'slot' => 'boots', 'stats' => ['armor' => 1]],
            'tabard' => ['id' => 'starter-horde-warcloth', 'name' => 'Horde Hunter Warcloth', 'slot' => 'tabard', 'stats' => ['health' => 1]],
            'ranged' => ['id' => 'starter-horde-totem', 'name' => 'Horde Hunter Totem', 'slot' => 'ranged', 'stats' => ['attackPower' => 1]],
        ],
    ],

];
