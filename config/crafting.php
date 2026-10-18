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
| makes    how many one making of a recipe makes, where it is more than one (arrows, by the
|          bundle).
|
*/

return [
    'items' => [
        'health-potion' => ['name' => 'Health Potion', 'image' => 'assets/powerups/health-potion.webp', 'rarity' => 'uncommon'],
        // Not made, only caught: a mana potion caught while time is already slowed, and the
        // arrows that did not fit in the quiver, go into the bags (App\Support\Bags::afterGame)
        'mana-potion' => ['name' => 'Mana Potion', 'image' => 'assets/powerups/mana-potion.webp', 'rarity' => 'uncommon'],
        // Made, or caught: Haste caught while he is already hasted goes into the bags as one
        'haste-potion' => ['name' => 'Haste Potion', 'image' => 'assets/powerups/haste-potion.webp', 'rarity' => 'uncommon'],
        'arrows' => ['name' => 'Arrows', 'image' => 'assets/powerups/bronze-arrows.webp', 'rarity' => 'common'],
        // Not made, only found: the two halves of what binds Thunderfury, a rare extra drop of
        // the last bosses of each side (boss_loot.bindings). Kept in the bank of the hunter
        // whose boss it was, and bound to him ("bound": never sent to the other hunter).
        'left-binding-of-the-windseeker' => ['name' => 'Left Binding of the Windseeker', 'image' => 'assets/items/gear/left-binding-of-the-windseeker.webp', 'rarity' => 'legendary', 'bound' => true],
        'right-binding-of-the-windseeker' => ['name' => 'Right Binding of the Windseeker', 'image' => 'assets/items/gear/right-binding-of-the-windseeker.webp', 'rarity' => 'legendary', 'bound' => true],
        // Made, but not into the bags: a piece of gear ("gear" => true), the hunter's for good
        // (config/gear.php, "crafted"). One to a hunter.
        'thunderfury' => ['name' => 'Thunderfury, Blessed Blade of the Windseeker', 'image' => 'assets/items/gear/thunderfury.webp', 'rarity' => 'legendary', 'gear' => true],
    ],

    /*
     * The most of each that a game is believed to put in the bags, for every minute it lasted:
     * potions caught at full health or while time is slowed, arrows that did not fit.
     */
    'stored_per_minute' => ['health-potion' => 4, 'mana-potion' => 4, 'haste-potion' => 4, 'arrows' => 300],

    'makes' => ['arrows' => 50],

    'recipes' => [
        'health-potion' => ['kingsblood' => 1, 'essence-of-water' => 1],
        // A bundle of arrows for the quiver: feather for the fletching, leather for the grip
        'arrows' => ['light-feather' => 1, 'rugged-leather' => 1],
        // Swiftness: the herb that hides a rogue, and water to carry it
        'haste-potion' => ['fadeleaf' => 1, 'essence-of-water' => 1],
        // The legendary blade: both Bindings, and the fire and water of the Firelord's lands
        'thunderfury' => [
            'left-binding-of-the-windseeker' => 1,
            'right-binding-of-the-windseeker' => 1,
            'fiery-core' => 10,
            'lava-core' => 10,
            'essence-of-water' => 4,
        ],
    ],
];
