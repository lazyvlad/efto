<?php

/*
|--------------------------------------------------------------------------
| Rare loot
|--------------------------------------------------------------------------
|
| The server decides which rare items a game contains. The game asks for them one chunk of
| play at a time, so the browser never holds more than the next chunk, and a pickup only
| counts if the server offered that item to that game.
|
| The items and weights mirror game/data/gameItems.js and itemProbabilities in
| game/config/gameConfig.js (tests/Feature/LootConfigTest.php checks they agree). Common
| items are listed too: they still drop at random in the browser, but their weights set
| how often a rare one comes up.
|
*/

return [

    // Seconds of play covered by one request for drops
    'chunk_seconds' => 30,

    // Items the game spawns per second of play (itemSpawnChance x 60 steps)
    'spawns_per_second' => 0.6,

    // How long before a chunk starts the game may ask for it (it asks 10 seconds ahead)
    'early_seconds' => 15,

    // Rarities decided here; the rest stay random in the browser
    'server_types' => ['epic', 'special', 'tier_set', 'legendary', 'zee_zgnan'],

    'weights' => [
        'regular' => 0.3,
        'green' => 0.11,
        'epic' => 0.07,
        'tier_set' => 0.055,
        'special' => 0.032,
        'legendary' => 0.02,
        'zee_zgnan' => 0.01,
    ],

    'items' => [
        'regular' => [
            'ring1', 'ring2', 'arcane-crystal', 'miners-cape', 'walking-stick', 'gold', 'wolf-master',
            'cape21', 'cape05', 'fork-knife', 'sapphire-gem', 'pearl-gem', 'hard-cheese', 'bread', 'fish',
            'light-feather', 'rugged-leather', 'kingsblood', 'fadeleaf', 'runecloth',
        ],
        'green' => [
            'swiss-army', 'gizmos', 'copper-coin', 'gold-coin', 'silver-coin', 'bronze-coin',
            'mithril-bar', 'thorium-bar', 'essence-of-water', 'dark-rune', 'righteous-orb',
        ],
        'epic' => [
            'black-lotuses', 'maladath', 'quick-strike-ring', 'brutality_blade', 'dalrends',
            'fiery-core', 'lava-core',
        ],
        'special' => ['crulshorukh', 'drakefangtalisman', 'onslaught', 'circle-of-applied-force'],
        'tier_set' => [
            'ashjrethul', 'ashkandi2', 'ds_helm', 'ds_shoulders', 'ds_chest', 'ds_bracers',
            'ds_gloves', 'ds_belt', 'ds_legs', 'ds_boots',
        ],
        'legendary' => ['ThunderFury'],
        'zee_zgnan' => ['zee'],
    ],

    // Every item in the game as the site shows it, rarest first (the game has its own copy of
    // the names and pictures in game/data/gameItems.js). Images are paths inside the built
    // game, public/game.
    'catalog' => [
        // zee_zgnan
        'zee' => ['name' => 'Zee Zgnan Tigar', 'image' => 'assets/items/zee.png'],

        // legendary
        'ThunderFury' => ['name' => 'Thunder Fury', 'image' => 'assets/items/tunder.png'],

        // tier_set
        'ashjrethul' => ['name' => "Ashjre'thul, Crossbow of Smiting", 'image' => 'assets/items/4.png'],
        'ashkandi2' => ['name' => 'Ashkandi, Greatsword of the Brotherhood', 'image' => 'assets/items/ashkandi.png'],
        'ds_helm' => ['name' => "Dragonstalker's Helm", 'image' => 'assets/items/dshelm.png'],
        'ds_shoulders' => ['name' => "Dragonstalker's Spaulders", 'image' => 'assets/items/dsshoulders.png'],
        'ds_chest' => ['name' => "Dragonstalker's Breastplate", 'image' => 'assets/items/dschest.png'],
        'ds_bracers' => ['name' => "Dragonstalker's Bracers", 'image' => 'assets/items/dsbracers.png'],
        'ds_gloves' => ['name' => "Dragonstalker's Gauntlets", 'image' => 'assets/items/dshands.png'],
        'ds_belt' => ['name' => "Dragonstalker's Belt", 'image' => 'assets/items/dsbelt.png'],
        'ds_legs' => ['name' => "Dragonstalker's Legguards", 'image' => 'assets/items/dslegs.png'],
        'ds_boots' => ['name' => "Dragonstalker's Greaves", 'image' => 'assets/items/dsboots.png'],

        // special
        'crulshorukh' => ['name' => 'Crulshorukh', 'image' => 'assets/items/6.png'],
        'drakefangtalisman' => ['name' => 'Drake Fang Talisman', 'image' => 'assets/items/drakefangtalisman.webp'],
        'onslaught' => ['name' => 'Onslaught', 'image' => 'assets/items/onslaught.webp'],
        'circle-of-applied-force' => ['name' => 'Circle of Applied', 'image' => 'assets/items/circle-of-applied-force.webp'],

        // epic
        'fiery-core' => ['name' => 'Fiery Core', 'image' => 'assets/items/fiery-core.webp'],
        'lava-core' => ['name' => 'Lava Core', 'image' => 'assets/items/lava-core.webp'],
        'black-lotuses' => ['name' => 'Stack of Black Lotus', 'image' => 'assets/items/black-lotuses.webp'],
        'maladath' => ['name' => 'Maladath', 'image' => 'assets/items/maladath.png'],
        'quick-strike-ring' => ['name' => 'Quick Strike Ring', 'image' => 'assets/items/quick-strike-ring.webp'],
        'brutality_blade' => ['name' => 'Brutality Blade', 'image' => 'assets/items/3.png'],
        'dalrends' => ['name' => 'Dal Rends', 'image' => 'assets/items/dalrends.png'],

        // green
        'swiss-army' => ['name' => 'Swiss Army Knife', 'image' => 'assets/items/swiss-army.webp'],
        'gizmos' => ['name' => 'Engineering Gizmos', 'image' => 'assets/items/gizmos.webp'],
        'copper-coin' => ['name' => 'Copper Coin', 'image' => 'assets/items/copper-coin.webp'],
        'gold-coin' => ['name' => 'Gold Coin', 'image' => 'assets/items/gold-coin.webp'],
        'silver-coin' => ['name' => 'Silver Coin', 'image' => 'assets/items/silver-coin.webp'],
        'bronze-coin' => ['name' => 'Bronze Coin', 'image' => 'assets/items/bronze-coin.webp'],
        'mithril-bar' => ['name' => 'Mithril Bar', 'image' => 'assets/items/mithril-bar.webp'],
        'thorium-bar' => ['name' => 'Thorium Bar', 'image' => 'assets/items/thorium-bar.webp'],
        'essence-of-water' => ['name' => 'Essence of Water', 'image' => 'assets/items/essence-of-water.webp'],
        'dark-rune' => ['name' => 'Dark Rune', 'image' => 'assets/items/dark-rune.webp'],
        'righteous-orb' => ['name' => 'Righteous Orb', 'image' => 'assets/items/righteous-orb.webp'],

        // regular
        'ring1' => ['name' => 'Ring 1', 'image' => 'assets/items/ring1.webp'],
        'ring2' => ['name' => 'Ring2', 'image' => 'assets/items/ring2.webp'],
        'arcane-crystal' => ['name' => 'Arcane Crystal', 'image' => 'assets/items/arcane-crystal.webp'],
        'miners-cape' => ['name' => 'Miners Cape', 'image' => 'assets/items/miners-cape.webp'],
        'walking-stick' => ['name' => 'Walking Stick', 'image' => 'assets/items/walking-stick.webp'],
        'gold' => ['name' => 'Gold', 'image' => 'assets/items/gold.webp'],
        'wolf-master' => ['name' => 'Wolfmaster Cape', 'image' => 'assets/items/wolf-master.webp'],
        'cape21' => ['name' => 'Woven Cape', 'image' => 'assets/items/cape21.webp'],
        'cape05' => ['name' => "Traveler's Cape", 'image' => 'assets/items/cape05.webp'],
        'fork-knife' => ['name' => 'Fork & Knife', 'image' => 'assets/items/fork-knife.webp'],
        'sapphire-gem' => ['name' => 'Sapphire Gem', 'image' => 'assets/items/sapphire-gem.webp'],
        'pearl-gem' => ['name' => 'Pearl Gem', 'image' => 'assets/items/pearl-gem.webp'],
        'hard-cheese' => ['name' => 'Hard Cheese', 'image' => 'assets/items/hard-cheese.webp'],
        'bread' => ['name' => 'Bread', 'image' => 'assets/items/bread.webp'],
        'light-feather' => ['name' => 'Light Feather', 'image' => 'assets/items/light-feather.webp'],
        'rugged-leather' => ['name' => 'Rugged Leather', 'image' => 'assets/items/rugged-leather.webp'],
        'kingsblood' => ['name' => 'Kingsblood', 'image' => 'assets/items/kingsblood.webp'],
        'fadeleaf' => ['name' => 'Fadeleaf', 'image' => 'assets/items/fadeleaf.webp'],
        'runecloth' => ['name' => 'Runecloth', 'image' => 'assets/items/runecloth.webp'],
        'fish' => ['name' => 'Fresh Fish', 'image' => 'assets/items/fish.webp'],
    ],

    // What catching an item is worth, in copper (100 copper = 1 silver, 100 silver = 1 gold).
    // The game shows the same amounts as it goes (coins in game/config/gameConfig.js); the
    // server works out what a finished game earned and adds it to the player's account.
    'coins' => [
        'regular' => 10,
        'green' => 25,
        'epic' => 100,
        'special' => 150,
        'tier_set' => 200,
        'legendary' => 500,
        'zee_zgnan' => 1000,
    ],

    // Defeating a boss pays this much for each zone it guards (the third boss: three times this)
    'boss_coins_per_zone' => 100,

    // Common items are counted as the browser reports them, but never more than this many
    // times what the game can have spawned in the time played
    'coins_spawn_allowance' => 1.5,

    // Offered at most once in a game
    'once_per_game' => ['zee'],

    // The level at which each server-decided rarity starts to drop (progression.unlockLevel in
    // game/config/gameConfig.js). A game that starts at or past that level, because the player
    // skipped ahead, is not held back by not_before_seconds for that rarity.
    'unlock_level' => [
        'epic' => 4,
        'special' => 6,
        'tier_set' => 8,
        'legendary' => 10,
        'zee_zgnan' => 12,
    ],

    // Rarities that never drop this early. In the game each rarity unlocks at a level
    // (progression.unlockLevel in game/config/gameConfig.js); these are the seconds of play
    // below which even a player who catches everything cannot have reached that level, so a
    // rare item is never offered to a game that could not show it. They also mean that opening
    // games until one starts with a prize costs minutes of play each time.
    'not_before_seconds' => [
        'epic' => 30,
        'special' => 60,
        'tier_set' => 90,
        'legendary' => 150,
        'zee_zgnan' => 210,
    ],

];
