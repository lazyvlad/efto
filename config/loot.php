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
        'regular' => 0.4,
        'green' => 0.2,
        'epic' => 0.1,
        'tier_set' => 0.055,
        'special' => 0.032,
        'legendary' => 0.02,
        'zee_zgnan' => 0.01,
    ],

    'items' => [
        'regular' => [
            'ring1', 'ring2', 'arcane-crystal', 'miners-cape', 'walking-stick', 'gold', 'wolf-master',
            'cape21', 'cape05', 'fork-knife', 'sapphire-gem', 'pearl-gem', 'hard-cheese', 'bread', 'fish',
        ],
        'green' => ['swiss-army', 'gizmos', 'copper-coin', 'gold-coin', 'silver-coin', 'bronze-coin'],
        'epic' => ['black-lotuses', 'maladath', 'quick-strike-ring', 'brutality_blade', 'dalrends'],
        'special' => ['crulshorukh', 'drakefangtalisman', 'onslaught', 'circle-of-applied-force'],
        'tier_set' => [
            'ashjrethul', 'ashkandi2', 'ds_helm', 'ds_shoulders', 'ds_chest', 'ds_bracers',
            'ds_gloves', 'ds_belt', 'ds_legs', 'ds_boots',
        ],
        'legendary' => ['ThunderFury'],
        'zee_zgnan' => ['zee'],
    ],

    // Offered at most once in a game
    'once_per_game' => ['zee'],

    // Rarities that never drop this early, so opening games until one starts with a prize
    // costs a minute of play each time
    'not_before_seconds' => [
        'legendary' => 60,
        'zee_zgnan' => 60,
    ],

];
