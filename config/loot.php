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
    'server_types' => ['epic', 'special', 'set_piece', 'legendary', 'zee_zgnan'],

    'weights' => [
        'regular' => 0.3,
        'green' => 0.11,
        'epic' => 0.067,
        'set_piece' => 0.024,
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
            'fiery-core', 'lava-core', 'ashjrethul', 'ashkandi2',
        ],
        'special' => ['crulshorukh', 'drakefangtalisman', 'onslaught', 'circle-of-applied-force'],
        // Pieces of the three hunter sets (see "sets" below for which belongs to which)
        'set_piece' => [
            'ds_helm', 'ds_shoulders', 'ds_chest', 'ds_bracers',
            'ds_gloves', 'ds_belt', 'ds_legs', 'ds_boots',
            'giantstalker-helmet', 'giantstalker-shoulders', 'giantstalker-chest', 'giantstalker-bracers',
            'giantstalker-gloves', 'giantstalker-belt', 'giantstalker-leggings', 'giantstalker-boots',
            'cryptstalker-helmet', 'cryptstalker-shoulders', 'cryptstalker-chest', 'cryptstalker-bracers',
            'cryptstalker-gloves', 'cryptstalker-belt', 'cryptstalker-leggings', 'cryptstalker-boots',
            'cryptstalker-ring',
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

        // set_piece
        'giantstalker-helmet' => ['name' => "Giantstalker's Helmet", 'image' => 'assets/items/giantstalker-helmet.webp'],
        'giantstalker-shoulders' => ['name' => "Giantstalker's Epaulets", 'image' => 'assets/items/giantstalker-shoulders.webp'],
        'giantstalker-chest' => ['name' => "Giantstalker's Breastplate", 'image' => 'assets/items/giantstalker-chest.webp'],
        'giantstalker-bracers' => ['name' => "Giantstalker's Bracers", 'image' => 'assets/items/giantstalker-bracers.webp'],
        'giantstalker-gloves' => ['name' => "Giantstalker's Gloves", 'image' => 'assets/items/giantstalker-gloves.webp'],
        'giantstalker-belt' => ['name' => "Giantstalker's Belt", 'image' => 'assets/items/giantstalker-belt.webp'],
        'giantstalker-leggings' => ['name' => "Giantstalker's Leggings", 'image' => 'assets/items/giantstalker-leggings.webp'],
        'giantstalker-boots' => ['name' => "Giantstalker's Boots", 'image' => 'assets/items/giantstalker-boots.webp'],
        'cryptstalker-helmet' => ['name' => 'Cryptstalker Headpiece', 'image' => 'assets/items/cryptstalker-helmet.webp'],
        'cryptstalker-shoulders' => ['name' => 'Cryptstalker Spaulders', 'image' => 'assets/items/cryptstalker-shoulders.webp'],
        'cryptstalker-chest' => ['name' => 'Cryptstalker Tunic', 'image' => 'assets/items/cryptstalker-chest.webp'],
        'cryptstalker-bracers' => ['name' => 'Cryptstalker Wristguards', 'image' => 'assets/items/cryptstalker-bracers.webp'],
        'cryptstalker-gloves' => ['name' => 'Cryptstalker Handguards', 'image' => 'assets/items/cryptstalker-gloves.webp'],
        'cryptstalker-belt' => ['name' => 'Cryptstalker Girdle', 'image' => 'assets/items/cryptstalker-belt.webp'],
        'cryptstalker-leggings' => ['name' => 'Cryptstalker Legguards', 'image' => 'assets/items/cryptstalker-leggings.webp'],
        'cryptstalker-boots' => ['name' => 'Cryptstalker Boots', 'image' => 'assets/items/cryptstalker-boots.webp'],
        'cryptstalker-ring' => ['name' => 'Ring of the Cryptstalker', 'image' => 'assets/items/cryptstalker-ring.webp'],
        'ds_helm' => ['name' => "Dragonstalker's Helm", 'image' => 'assets/items/dragonstalker-helmet.webp'],
        'ds_shoulders' => ['name' => "Dragonstalker's Spaulders", 'image' => 'assets/items/dragonstalker-shoulders.webp'],
        'ds_chest' => ['name' => "Dragonstalker's Breastplate", 'image' => 'assets/items/dragonstalker-chest.webp'],
        'ds_bracers' => ['name' => "Dragonstalker's Bracers", 'image' => 'assets/items/dragonstalker-bracers.webp'],
        'ds_gloves' => ['name' => "Dragonstalker's Gauntlets", 'image' => 'assets/items/dragonstalker-gloves.webp'],
        'ds_belt' => ['name' => "Dragonstalker's Belt", 'image' => 'assets/items/dragonstalker-belt.webp'],
        'ds_legs' => ['name' => "Dragonstalker's Legguards", 'image' => 'assets/items/dragonstalker-leggings.webp'],
        'ds_boots' => ['name' => "Dragonstalker's Greaves", 'image' => 'assets/items/dragonstalker-boots.webp'],

        // special
        'crulshorukh' => ['name' => 'Crulshorukh', 'image' => 'assets/items/6.png'],
        'drakefangtalisman' => ['name' => 'Drake Fang Talisman', 'image' => 'assets/items/drakefangtalisman.webp'],
        'onslaught' => ['name' => 'Onslaught', 'image' => 'assets/items/onslaught.webp'],
        'circle-of-applied-force' => ['name' => 'Circle of Applied', 'image' => 'assets/items/circle-of-applied-force.webp'],

        // epic
        'fiery-core' => ['name' => 'Fiery Core', 'image' => 'assets/items/fiery-core.webp'],
        'lava-core' => ['name' => 'Lava Core', 'image' => 'assets/items/lava-core.webp'],
        'ashjrethul' => ['name' => "Ashjre'thul, Crossbow of Smiting", 'image' => 'assets/items/4.png'],
        'black-lotuses' => ['name' => 'Stack of Black Lotus', 'image' => 'assets/items/black-lotuses.webp'],
        'maladath' => ['name' => 'Maladath', 'image' => 'assets/items/maladath.png'],
        'ashkandi2' => ['name' => 'Ashkandi, Greatsword of the Brotherhood', 'image' => 'assets/items/ashkandi.png'],
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
        'set_piece' => 200,
        'legendary' => 500,
        'zee_zgnan' => 1000,
    ],

    // Defeating a boss pays this much for each zone it guards (the third boss: three times this)
    'boss_coins_per_zone' => 100,

    // Common items are counted as the browser reports them, but never more than this many
    // times what the game can have spawned in the time played
    'coins_spawn_allowance' => 1.5,

    // Crafting materials (game/data/materials.js has the same list). A material pays no coins
    // when a game ends: it is kept on the player's account, to be made into something later.
    'materials' => [
        'runecloth', 'rugged-leather', 'light-feather', 'kingsblood', 'fadeleaf', 'black-lotuses',
        'mithril-bar', 'thorium-bar', 'arcane-crystal', 'sapphire-gem', 'pearl-gem',
        'essence-of-water', 'dark-rune', 'righteous-orb', 'fiery-core', 'lava-core',
    ],

    // What a material costs to buy, in copper, into the bank of the hunter it is bought for
    // (BagController::buyMaterial): five times what catching it would be worth, by its rarity
    // (coins.by_type), the Black Lotus twice that again
    'material_prices' => [
        'runecloth' => 50, 'rugged-leather' => 50, 'light-feather' => 50, 'kingsblood' => 50,
        'fadeleaf' => 50, 'arcane-crystal' => 50, 'sapphire-gem' => 50, 'pearl-gem' => 50,
        'mithril-bar' => 125, 'thorium-bar' => 125, 'essence-of-water' => 125, 'dark-rune' => 125,
        'righteous-orb' => 125,
        'fiery-core' => 500, 'lava-core' => 500, 'black-lotuses' => 1000,
    ],

    // The hunter's bags (bags in game/config/gameConfig.js has the same numbers). Everything
    // caught goes into them: a slot holds a stack of one kind. With no room left, what is
    // caught is sold on the spot for less, and a material sold that way is not kept. Bags are
    // bought with coins and added to the backpack: size in slots => price in copper.
    'bags' => [
        'backpack' => 24,
        'bag_slots' => 4,
        'stack' => 20,
        'full_penalty' => 0.1,
        // Kinds a slot holds more of than 'stack' (itemStacks in game/config/gameConfig.js)
        'item_stacks' => ['arrows' => 200],
        'for_sale' => [
            6 => 50000,
            8 => 150000,
            10 => 400000,
            12 => 1000000,
            14 => 2500000,
        ],
    ],

    // The hunter's sets, collected over many games: a logged-in player keeps every piece they
    // pick up. Each set starts to drop at a level (sets in game/config/gameConfig.js has the
    // same levels), so its pieces are held back until the seconds below unless the game started
    // at or past that level.
    'sets' => [
        'giantstalker' => [
            'name' => 'Giantstalker Armor',
            'tier' => 1,
            'from_level' => 3,
            'not_before_seconds' => 20,
            // What each piece worn gives, and what the set gives at so many pieces worn (sets
            // in game/config/gameConfig.js: the same numbers, for the items page)
            'per_piece' => ['health' => 3, 'armor' => 4, 'attackPower' => 2],
            'bonuses' => [3 => ['dodge' => 0.02], 5 => ['dodge' => 0.05], 8 => ['dodge' => 0.05, 'multishot' => 0.4]],
            'pieces' => [
                'giantstalker-helmet', 'giantstalker-shoulders', 'giantstalker-chest', 'giantstalker-bracers',
                'giantstalker-gloves', 'giantstalker-belt', 'giantstalker-leggings', 'giantstalker-boots',
            ],
        ],
        'dragonstalker' => [
            'name' => 'Dragonstalker Armor',
            'tier' => 2,
            'from_level' => 9,
            'not_before_seconds' => 150,
            'per_piece' => ['health' => 4, 'armor' => 6, 'attackPower' => 4],
            'bonuses' => [3 => ['crit' => 0.02], 5 => ['crit' => 0.05], 8 => ['crit' => 0.05, 'arcane' => 0.5]],
            'pieces' => [
                'ds_helm', 'ds_shoulders', 'ds_chest', 'ds_bracers',
                'ds_gloves', 'ds_belt', 'ds_legs', 'ds_boots',
            ],
        ],
        'cryptstalker' => [
            'name' => 'Cryptstalker Armor',
            'tier' => 3,
            'from_level' => 15,
            'not_before_seconds' => 400,
            'per_piece' => ['health' => 5, 'armor' => 8, 'attackPower' => 6],
            'bonuses' => [2 => ['bossDamage' => 0.05], 4 => ['bossDamage' => 0.1], 6 => ['bossDamage' => 0.15], 8 => ['bossDamage' => 0.2]],
            'pieces' => [
                'cryptstalker-helmet', 'cryptstalker-shoulders', 'cryptstalker-chest', 'cryptstalker-bracers',
                'cryptstalker-gloves', 'cryptstalker-belt', 'cryptstalker-leggings', 'cryptstalker-boots',
                'cryptstalker-ring',
            ],
        ],
    ],

    // Offered at most once in a game
    'once_per_game' => ['zee'],

    // Pieces of the hunter sets never fall: only the bosses drop them, a set to each stretch of
    // zones (boss_loot.set_pieces). The game gives them no chance of its own either
    // (calculateItemProbability in game/utils/spawning.js).
    'set_pieces_per_game' => 0,

    // Gear the bosses drop, never falling (config/boss_loot.php "pools"): the game gives them
    // no chance of their own either (baseProbability 0 in game/data/gameItems.js)
    'never_falls' => [
        'maladath', 'quick-strike-ring', 'brutality_blade', 'dalrends', 'ashjrethul', 'ashkandi2',
        'crulshorukh', 'drakefangtalisman', 'onslaught', 'circle-of-applied-force',
    ],

    // In their place, the gear of the zone the game is in falls (App\Models\Game::skyGear): in
    // each chunk of play, so much chance of one of its greens, and of one of its blues
    'zone_sky' => ['uncommon' => 0.3, 'rare' => 0.1],

    // The level at which each server-decided rarity starts to drop (progression.unlockLevel in
    // game/config/gameConfig.js). A game that starts at or past that level, because the player
    // skipped ahead, is not held back by not_before_seconds for that rarity.
    'unlock_level' => [
        'epic' => 4,
        'special' => 6,
        'set_piece' => 3,
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
        'set_piece' => 20,
        'legendary' => 150,
        'zee_zgnan' => 210,
    ],

];
