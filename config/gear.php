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

    // What a boss's item gives, before its zone is counted. Each number grows by "per_zone"
    // of itself for every zone past the first (the tenth boss: 3.25 times these).
    'budget' => [
        'per_zone' => 0.25,
        // By what kind of slot it is worn in, then by rarity
        'weapon' => [
            'uncommon' => ['attackPower' => 2],
            'rare' => ['attackPower' => 3],
            'epic' => ['attackPower' => 5, 'crit' => 1],
        ],
        'armor' => [
            'uncommon' => ['armor' => 3, 'health' => 2],
            'rare' => ['armor' => 4, 'health' => 3],
            'epic' => ['armor' => 6, 'health' => 5],
        ],
        'jewelry' => [
            'uncommon' => ['health' => 3],
            'rare' => ['health' => 3, 'attackPower' => 1],
            'epic' => ['health' => 4, 'attackPower' => 3],
        ],
        // Never scaled by zone: a point of crit is a point of crit
        'flat' => ['crit', 'dodge', 'carrying'],
        // Carrying, on rare items and on epic trinkets: by how far in the boss stands
        'carrying' => ['until_zone_3' => 1, 'until_zone_7' => 2, 'after' => 3],
    ],

    // What a boss's item sells for, in copper, for each zone its boss guards
    'boss_value_per_zone' => ['uncommon' => 100, 'rare' => 300, 'epic' => 1000],

    // The weapons and jewellery that fall in a game. They sell for what their rarity paid
    // when they were sold on the spot ("coins" in config/loot.php).
    'drops' => [
        'ashkandi2' => ['slot' => 'mainhand', 'stats' => ['attackPower' => 12]],
        'brutality_blade' => ['slot' => 'mainhand', 'stats' => ['attackPower' => 9, 'crit' => 1]],
        'maladath' => ['slot' => 'mainhand', 'stats' => ['attackPower' => 8, 'dodge' => 1]],
        'crulshorukh' => ['slot' => 'mainhand', 'stats' => ['attackPower' => 11]],
        'dalrends' => ['slot' => 'offhand', 'stats' => ['attackPower' => 7, 'crit' => 1]],
        'ashjrethul' => ['slot' => 'ranged', 'stats' => ['attackPower' => 14, 'crit' => 1]],
        'quick-strike-ring' => ['slot' => 'ring', 'stats' => ['attackPower' => 5, 'crit' => 1]],
        'circle-of-applied-force' => ['slot' => 'ring', 'stats' => ['attackPower' => 5, 'health' => 4]],
        'drakefangtalisman' => ['slot' => 'trinket', 'stats' => ['attackPower' => 6, 'dodge' => 1, 'carrying' => 2]],
        'onslaught' => ['slot' => 'belt', 'stats' => ['attackPower' => 6, 'health' => 5]],
    ],

];
