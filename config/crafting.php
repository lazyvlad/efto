<?php

/*
|--------------------------------------------------------------------------
| Crafting
|--------------------------------------------------------------------------
|
| What the hunter can make, between games, from what is in his bags (App\Support\Bags). Only
| what is in the bags can be used: materials are moved there from the bank first. What is made
| goes into the bags too, a slot holding loot.bags.stack of one kind.
|
| items    the things that can be made: their name and picture. What a potion does in a fight
|          is the game's (potions in game/config/gameConfig.js).
| recipes  for each, what one of it takes: [materialId => how many].
|
*/

return [
    'items' => [
        'health-potion' => ['name' => 'Health Potion', 'image' => 'assets/powerups/health-potion.webp', 'rarity' => 'uncommon'],
    ],

    'recipes' => [
        'health-potion' => ['kingsblood' => 1, 'essence-of-water' => 1],
    ],
];
