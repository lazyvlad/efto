<?php

/*
|--------------------------------------------------------------------------
| Boss loot
|--------------------------------------------------------------------------
|
| Every boss drops one item when it is defeated. The server picks which: first a rarity, by
| the chances below, then that boss's item of that rarity. A logged-in player keeps what
| drops (the rows of boss_drops); a guest is only shown it.
|
| The bosses are listed by side in zone order and mirror game/data/bosses.js
| (tests/Feature/BossLootConfigTest.php checks they agree). Item ids must be unique and must
| not change once players own them.
|
*/

return [

    // One roll per defeated boss; the chances add up to 1
    'chances' => [
        'uncommon' => 0.70,
        'rare' => 0.24,
        'epic' => 0.06,
    ],

    // A boss cannot be down sooner than this many seconds into a game for each zone it guards
    // (the third boss: three times this). Stops a boss being reported the moment a game opens.
    'min_seconds_per_zone' => 20,

    // The large quiver: besides its item, a boss may drop this for a logged-in player who does
    // not have it yet. It is kept on the account and found only once; in the game it adds four
    // slots to the quiver, doubling the arrows the hunter can carry (quiver in
    // game/config/gameConfig.js).
    'quiver' => [
        'name' => 'Ancient Sinew Wrapped Lamina',
        'chance' => 0.1,
    ],

    // Boss Rush: a game of nothing but the bosses of one side, back to back. For logged-in
    // players, who pay this much copper to enter. The bosses pay and drop as they always do,
    // but the game stays off the leaderboard. They fall faster than in a normal game, so a
    // boss may be reported this many seconds into the game for each one before it and itself.
    'rush' => [
        'entry_fee' => 5000,
        'min_seconds_per_boss' => 6,
    ],

    // Skipping ahead: a logged-in player may start a game in any zone whose earlier bosses
    // they have defeated before (they own loot from each), for this much copper per zone
    // skipped. Starting in the third zone costs twice this.
    'skip_cost_per_zone' => 5000,

    // Levels in a zone (levelsPerBackground in game/config/gameConfig.js)
    'levels_per_zone' => 2,

    // Images are paths inside the built game, public/game
    'bosses' => [
        'alliance' => [
            'garrick-padfoot' => [
                'name' => 'Garrick Padfoot',
                'image' => 'assets/bosses/alliance/01-garrick-padfoot.webp',
                'loot' => [
                    'uncommon' => ['id' => 'garricks-red-bandana', 'name' => "Garrick's Red Bandana"],
                    'rare' => ['id' => 'padfoots-throwing-dagger', 'name' => "Padfoot's Throwing Dagger"],
                    'epic' => ['id' => 'garricks-head', 'name' => "Garrick's Head"],
                ],
            ],
            'hogger' => [
                'name' => 'Hogger',
                'image' => 'assets/bosses/alliance/02-hogger.webp',
                'loot' => [
                    'uncommon' => ['id' => 'hoggers-chewed-collar', 'name' => "Hogger's Chewed Collar"],
                    'rare' => ['id' => 'huge-gnoll-claw', 'name' => 'Huge Gnoll Claw'],
                    'epic' => ['id' => 'hoggers-trophy-axe', 'name' => "Hogger's Trophy Axe"],
                ],
            ],
            'bazil-thredd' => [
                'name' => 'Bazil Thredd',
                'image' => 'assets/bosses/alliance/03-bazil-thredd.webp',
                'loot' => [
                    'uncommon' => ['id' => 'stockade-shiv', 'name' => 'Stockade Shiv'],
                    'rare' => ['id' => 'thredds-prison-key', 'name' => "Thredd's Prison Key"],
                    'epic' => ['id' => 'head-of-bazil-thredd', 'name' => 'Head of Bazil Thredd'],
                ],
            ],
            'edwin-vancleef' => [
                'name' => 'Edwin VanCleef',
                'image' => 'assets/bosses/alliance/04-edwin-vancleef.webp',
                'loot' => [
                    'uncommon' => ['id' => 'blackened-defias-belt', 'name' => 'Blackened Defias Belt'],
                    'rare' => ['id' => 'cape-of-the-brotherhood', 'name' => 'Cape of the Brotherhood'],
                    'epic' => ['id' => 'cruel-barb', 'name' => 'Cruel Barb'],
                ],
            ],
            'gath-ilzogg' => [
                'name' => "Gath'Ilzogg",
                'image' => 'assets/bosses/alliance/05-gath-ilzogg.webp',
                'loot' => [
                    'uncommon' => ['id' => 'blackrock-tabard', 'name' => 'Blackrock Tabard'],
                    'rare' => ['id' => 'gathilzoggs-war-axe', 'name' => "Gath'Ilzogg's War Axe"],
                    'epic' => ['id' => 'head-of-gathilzogg', 'name' => "Head of Gath'Ilzogg"],
                ],
            ],
            'stitches' => [
                'name' => 'Stitches',
                'image' => 'assets/bosses/alliance/06-stitches.webp',
                'loot' => [
                    'uncommon' => ['id' => 'stitches-femur', 'name' => "Stitches' Femur"],
                    'rare' => ['id' => 'abominations-hook', 'name' => "Abomination's Hook"],
                    'epic' => ['id' => 'embalmers-cleaver', 'name' => "Embalmer's Cleaver"],
                ],
            ],
            'chieftain-nekrosh' => [
                'name' => "Chieftain Nek'rosh",
                'image' => 'assets/bosses/alliance/07-chieftain-nekrosh.webp',
                'loot' => [
                    'uncommon' => ['id' => 'dragonmaw-shinbone', 'name' => 'Dragonmaw Shinbone'],
                    'rare' => ['id' => 'nekroshs-spiked-mace', 'name' => "Nek'rosh's Spiked Mace"],
                    'epic' => ['id' => 'nekroshs-head', 'name' => "Nek'rosh's Head"],
                ],
            ],
            'fozruk' => [
                'name' => 'Fozruk',
                'image' => 'assets/bosses/alliance/08-fozruk.webp',
                'loot' => [
                    'uncommon' => ['id' => 'chunk-of-fozruk', 'name' => 'Chunk of Fozruk'],
                    'rare' => ['id' => 'rod-of-order', 'name' => 'Rod of Order'],
                    'epic' => ['id' => 'heart-of-the-mountain-giant', 'name' => 'Heart of the Mountain Giant'],
                ],
            ],
            'king-bangalash' => [
                'name' => 'King Bangalash',
                'image' => 'assets/bosses/alliance/09-king-bangalash.webp',
                'loot' => [
                    'uncommon' => ['id' => 'white-tiger-pelt', 'name' => 'White Tiger Pelt'],
                    'rare' => ['id' => 'bangalashs-fang', 'name' => "Bangalash's Fang"],
                    'epic' => ['id' => 'head-of-bangalash', 'name' => 'Head of Bangalash'],
                ],
            ],
            'vile-priestess-hexx' => [
                'name' => 'Vile Priestess Hexx',
                'image' => 'assets/bosses/alliance/10-vile-priestess-hexx.webp',
                'loot' => [
                    'uncommon' => ['id' => 'atalai-tablet', 'name' => "Atal'ai Tablet"],
                    'rare' => ['id' => 'hexxs-voodoo-mask', 'name' => "Hexx's Voodoo Mask"],
                    'epic' => ['id' => 'vilebranch-soul-dagger', 'name' => 'Vilebranch Soul Dagger'],
                ],
            ],
        ],
        'horde' => [
            'sarkoth' => [
                'name' => 'Sarkoth',
                'image' => 'assets/bosses/horde/01-sarkoth.webp',
                'loot' => [
                    'uncommon' => ['id' => 'scorpid-stinger', 'name' => 'Scorpid Stinger'],
                    'rare' => ['id' => 'sarkoths-mangled-claw', 'name' => "Sarkoth's Mangled Claw"],
                    'epic' => ['id' => 'venom-etched-carapace', 'name' => 'Venom-Etched Carapace'],
                ],
            ],
            'zalazane' => [
                'name' => 'Zalazane',
                'image' => 'assets/bosses/horde/02-zalazane.webp',
                'loot' => [
                    'uncommon' => ['id' => 'darkspear-voodoo-charm', 'name' => 'Darkspear Voodoo Charm'],
                    'rare' => ['id' => 'zalazanes-witch-doctor-mask', 'name' => "Zalazane's Witch Doctor Mask"],
                    'epic' => ['id' => 'zalazanes-head', 'name' => "Zalazane's Head"],
                ],
            ],
            'taragaman' => [
                'name' => 'Taragaman the Hungerer',
                'image' => 'assets/bosses/horde/03-taragaman.webp',
                'loot' => [
                    'uncommon' => ['id' => 'subterranean-cape', 'name' => 'Subterranean Cape'],
                    'rare' => ['id' => 'cursed-felblade', 'name' => 'Cursed Felblade'],
                    'epic' => ['id' => 'heart-of-taragaman', 'name' => 'Heart of Taragaman'],
                ],
            ],
            'echeyakee' => [
                'name' => 'Echeyakee',
                'image' => 'assets/bosses/horde/04-echeyakee.webp',
                'loot' => [
                    'uncommon' => ['id' => 'white-lion-fang', 'name' => 'White Lion Fang'],
                    'rare' => ['id' => 'horn-of-echeyakee', 'name' => 'Horn of Echeyakee'],
                    'epic' => ['id' => 'echeyakees-hide', 'name' => "Echeyakee's Hide"],
                ],
            ],
            'gerenzo-wrenchwhistle' => [
                'name' => 'Gerenzo Wrenchwhistle',
                'image' => 'assets/bosses/horde/05-gerenzo-wrenchwhistle.webp',
                'loot' => [
                    'uncommon' => ['id' => 'venture-co-blueprints', 'name' => 'Venture Co. Blueprints'],
                    'rare' => ['id' => 'wrenchwhistles-spanner', 'name' => "Wrenchwhistle's Spanner"],
                    'epic' => ['id' => 'gerenzos-mechanical-arm', 'name' => "Gerenzo's Mechanical Arm"],
                ],
            ],
            'shadumbra' => [
                'name' => 'Shadumbra',
                'image' => 'assets/bosses/horde/06-shadumbra.webp',
                'loot' => [
                    'uncommon' => ['id' => 'shadow-panther-fang', 'name' => 'Shadow Panther Fang'],
                    'rare' => ['id' => 'ashenvale-shadow-pelt', 'name' => 'Ashenvale Shadow Pelt'],
                    'epic' => ['id' => 'shadumbras-head', 'name' => "Shadumbra's Head"],
                ],
            ],
            'arnak-grimtotem' => [
                'name' => 'Arnak Grimtotem',
                'image' => 'assets/bosses/horde/07-arnak-grimtotem.webp',
                'loot' => [
                    'uncommon' => ['id' => 'grimtotem-war-totem', 'name' => 'Grimtotem War Totem'],
                    'rare' => ['id' => 'grimtotem-battle-harness', 'name' => 'Grimtotem Battle Harness'],
                    'epic' => ['id' => 'arnaks-hoof', 'name' => "Arnak's Hoof"],
                ],
            ],
            'big-samras' => [
                'name' => 'Big Samras',
                'image' => 'assets/bosses/horde/08-big-samras.webp',
                'loot' => [
                    'uncommon' => ['id' => 'thick-bear-fur', 'name' => 'Thick Bear Fur'],
                    'rare' => ['id' => 'samras-claw', 'name' => "Samras' Claw"],
                    'epic' => ['id' => 'hide-of-big-samras', 'name' => 'Hide of Big Samras'],
                ],
            ],
            'khan-dezhepah' => [
                'name' => "Khan Dez'hepah",
                'image' => 'assets/bosses/horde/09-khan-dezhepah.webp',
                'loot' => [
                    'uncommon' => ['id' => 'kolkar-bracers', 'name' => 'Kolkar Bracers'],
                    'rare' => ['id' => 'centaur-war-spear', 'name' => 'Centaur War Spear'],
                    'epic' => ['id' => 'khan-dezhepahs-head', 'name' => "Khan Dez'hepah's Head"],
                ],
            ],
            'chief-ukorz-sandscalp' => [
                'name' => 'Chief Ukorz Sandscalp',
                'image' => 'assets/bosses/horde/10-chief-ukorz-sandscalp.webp',
                'loot' => [
                    'uncommon' => ['id' => 'big-bad-pauldrons', 'name' => 'Big Bad Pauldrons'],
                    'rare' => ['id' => 'ripsaw', 'name' => 'Ripsaw'],
                    'epic' => ['id' => 'jangthraze-the-protector', 'name' => "Jang'thraze the Protector"],
                ],
            ],
        ],
    ],

];
