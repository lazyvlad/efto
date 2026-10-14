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
| items    the things that can be made (and those only caught, kept in the bags the same way):
|          their name and picture. What a potion does in a fight is the game's (potions in
|          game/config/gameConfig.js).
| recipes  for each, what one of it takes: [materialId => how many].
|
*/

return [
    'items' => [
        'health-potion' => ['name' => 'Health Potion', 'image' => 'assets/powerups/health-potion.webp', 'rarity' => 'uncommon'],
        // Not made, only caught: a mana potion caught while time is already slowed, and the
        // arrows that did not fit in the quiver, go into the bags (App\Support\Bags::afterGame)
        'mana-potion' => ['name' => 'Mana Potion', 'image' => 'assets/powerups/mana-potion.webp', 'rarity' => 'uncommon'],
        'arrows' => ['name' => 'Arrows', 'image' => 'assets/powerups/bronze-arrows.webp', 'rarity' => 'common'],
    ],

    /*
     * The most of each that a game is believed to put in the bags, for every minute it lasted:
     * potions caught at full health or while time is slowed, arrows that did not fit.
     */
    'stored_per_minute' => ['health-potion' => 4, 'mana-potion' => 4, 'arrows' => 300],

    'recipes' => [
        'health-potion' => ['kingsblood' => 1, 'essence-of-water' => 1],
    ],
];
