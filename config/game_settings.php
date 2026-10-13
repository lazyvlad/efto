<?php

/*
|--------------------------------------------------------------------------
| Game settings an admin can change
|--------------------------------------------------------------------------
|
| The numbers on the admin section's Settings page (App\Support\GameSettings). Each is one
| value of the game with the range it may be given. A changed value is kept in the "settings"
| table and laid over the game's own:
|
|   "config"   the server's value it replaces (a key of config/loot.php and the like);
|   "game"     the value it replaces in the game itself (a path into gameConfig, in
|              game/config/gameConfig.js), handed to the game when its page loads;
|   "default"  for a setting only the game has: its value there. "source" is how that value
|              reads in gameConfig.js, which tests/Feature/GameSettingsTest.php checks.
|
| A setting with "config" takes its default from that file, so nothing is repeated here.
|
*/

$rarities = [
    'regular' => 'Regular items',
    'green' => 'Green items',
    'epic' => 'Epic items',
    'set_piece' => 'Set pieces',
    'special' => 'Special items',
    'legendary' => 'Thunderfury',
    'zee_zgnan' => 'Zee Zgnan Tigar',
];

$settings = [
    // ----- The bosses -----
    'boss_health_base' => [
        'group' => 'Bosses', 'label' => 'Health of the first boss, before its zone is counted',
        'game' => 'bosses.health.base', 'default' => 240, 'source' => 'health: \{ base: ([\d.]+)',
        'min' => 50, 'max' => 5000, 'step' => 1,
    ],
    'boss_health_per_zone' => [
        'group' => 'Bosses', 'label' => 'Health added for each zone',
        'help' => 'A boss has the first number plus this for every zone it guards: the tenth has ten times this more.',
        'game' => 'bosses.health.perZone', 'default' => 257, 'source' => 'health: \{ base: [\d.]+, perZone: ([\d.]+)',
        'min' => 0, 'max' => 2000, 'step' => 1,
    ],
    'boss_damage_base' => [
        'group' => 'Bosses', 'label' => 'Damage of a boss attack, before its zone is counted',
        'game' => 'bosses.damage.base', 'default' => 8, 'source' => 'damage: \{ base: ([\d.]+)',
        'min' => 1, 'max' => 60, 'step' => 0.5,
    ],
    'boss_damage_per_zone' => [
        'group' => 'Bosses', 'label' => 'Damage added for each zone',
        'game' => 'bosses.damage.perZone', 'default' => 0.8, 'source' => 'damage: \{ base: [\d.]+, perZone: ([\d.]+)',
        'min' => 0, 'max' => 10, 'step' => 0.1,
    ],
    'boss_reward_health' => [
        'group' => 'Bosses', 'label' => 'Health given back for defeating a boss',
        'game' => 'bosses.reward.health', 'default' => 10, 'source' => 'reward: \{[^}]*health: ([\d.]+)',
        'min' => 0, 'max' => 100, 'step' => 1,
    ],
    'arrow_damage' => [
        'group' => 'Bosses', 'label' => 'Damage of one arrow',
        'game' => 'bosses.arrowDamage', 'default' => 10, 'source' => 'arrowDamage: ([\d.]+)',
        'min' => 1, 'max' => 100, 'step' => 1,
    ],

    // ----- The hunter -----
    'miss_health_loss' => [
        'group' => 'The hunter', 'label' => 'Health lost for an item that falls past',
        'game' => 'gameplay.healthLossOnMiss', 'default' => 2, 'source' => 'healthLossOnMiss: ([\d.]+)',
        'min' => 0, 'max' => 25, 'step' => 0.5,
    ],
    'quiver_start' => [
        'group' => 'The hunter', 'label' => 'Quiver slots filled at the start of a game',
        'help' => 'Of the four slots everyone has; a slot is 50 arrows.',
        'game' => 'quiver.startFilled', 'default' => 2, 'source' => 'startFilled: ([\d.]+)',
        'min' => 1, 'max' => 4, 'step' => 1,
    ],
    'pet_every' => [
        'group' => 'The hunter', 'label' => 'Steps between the items the pet fetches',
        'help' => 'The game takes 60 steps a second: 1200 is 20 seconds.',
        'game' => 'pet.every', 'default' => 1200, 'source' => 'every: ([\d.]+),\s*// Steps from one fetched item',
        'min' => 120, 'max' => 7200, 'step' => 60,
    ],

    // ----- Boss loot and prices -----
    'quiver_chance' => [
        'group' => 'Boss loot and prices', 'label' => 'Chance a boss drops the large quiver',
        'help' => 'From 0 to 1: 0.1 is one boss in ten. Only for a logged-in player who does not have it.',
        'config' => 'boss_loot.quiver.chance',
        'min' => 0, 'max' => 1, 'step' => 0.01,
    ],
    'skip_cost_per_zone' => [
        'group' => 'Boss loot and prices', 'label' => 'Price of skipping one zone, in copper',
        'help' => '100 copper is a silver, 10,000 a gold.',
        'config' => 'boss_loot.skip_cost_per_zone',
        'min' => 0, 'max' => 10000000, 'step' => 1,
    ],
    'rush_entry_fee' => [
        'group' => 'Boss loot and prices', 'label' => 'Price of a Boss Rush, in copper',
        'config' => 'boss_loot.rush.entry_fee',
        'min' => 0, 'max' => 10000000, 'step' => 1,
    ],
    'boss_coins_per_zone' => [
        'group' => 'Boss loot and prices', 'label' => 'Copper a boss pays for each zone it guards',
        'config' => 'loot.boss_coins_per_zone', 'game' => 'coins.bossPerZone',
        'min' => 0, 'max' => 100000, 'step' => 1,
    ],

    // ----- The site -----
    'leaderboard_size' => [
        'group' => 'The site', 'label' => 'Scores shown on the leaderboard',
        'config' => 'game.leaderboard_size',
        'min' => 10, 'max' => 1000, 'step' => 1,
    ],
];

// ----- How often each rarity falls, and what catching one pays -----
foreach ($rarities as $type => $name) {
    $settings["weight_$type"] = [
        'group' => 'How often items fall', 'label' => $name,
        'config' => "loot.weights.$type", 'game' => "itemProbabilities.$type",
        'min' => 0, 'max' => 1, 'step' => 0.001,
    ];
    $settings["coins_$type"] = [
        'group' => 'Copper for catching an item', 'label' => $name,
        'config' => "loot.coins.$type", 'game' => "coins.byType.$type",
        'min' => 0, 'max' => 100000, 'step' => 1,
    ];
}

return [
    'settings' => $settings,

    // What the page says under the heading of a group
    'groups' => [
        'Bosses' => 'How hard the fights are. A boss later in the game is stronger by the "for each zone" numbers.',
        'The hunter' => null,
        'How often items fall' => 'The weight of one item of each rarity: a higher number means it falls more often against the others. Regular and green items are picked by the game, the rest by the server.',
        'Copper for catching an item' => '100 copper is a silver.',
        'Boss loot and prices' => null,
        'The site' => null,
    ],
];
