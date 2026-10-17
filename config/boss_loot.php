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

    // The large quiver: besides its item, a boss of this zone or later may drop this for a
    // player who does not have it yet. Each hunter finds his own (App\Support\Gear); worn in
    // the quiver slot it adds this many slots to the quiver, doubling the arrows the hunter can
    // carry (quiver in game/config/gameConfig.js).
    'quiver' => [
        'name' => 'Ancient Sinew Wrapped Lamina',
        'slots' => 4,
        'chance' => 0.1,
        'from_zone' => 4,
    ],

    // The hunter sets: besides its item, a boss from the fourth zone may drop a piece of its
    // set, one its side's hunter does not have yet from those that boss gives (none once he has
    // them all; never one of another boss's or set's). The first boss of a set's zones gives the
    // smaller pieces, the second the larger; Cryptstalker's three share its nine. The same on
    // both sides (the art agent's loot proposal, art-workbench/loot-distribution). A guest's
    // account keeps them as anyone's does.
    'set_pieces' => [
        4 => ['set' => 'giantstalker', 'chance' => 0.5, 'pieces' => ['giantstalker-bracers', 'giantstalker-gloves', 'giantstalker-belt', 'giantstalker-boots']],
        5 => ['set' => 'giantstalker', 'chance' => 0.5, 'pieces' => ['giantstalker-helmet', 'giantstalker-shoulders', 'giantstalker-chest', 'giantstalker-leggings']],
        6 => ['set' => 'dragonstalker', 'chance' => 0.4, 'pieces' => ['ds_bracers', 'ds_gloves', 'ds_belt', 'ds_boots']],
        7 => ['set' => 'dragonstalker', 'chance' => 0.4, 'pieces' => ['ds_helm', 'ds_shoulders', 'ds_chest', 'ds_legs']],
        8 => ['set' => 'cryptstalker', 'chance' => 0.3, 'pieces' => ['cryptstalker-bracers', 'cryptstalker-belt', 'cryptstalker-boots']],
        9 => ['set' => 'cryptstalker', 'chance' => 0.3, 'pieces' => ['cryptstalker-gloves', 'cryptstalker-leggings', 'cryptstalker-ring']],
        10 => ['set' => 'cryptstalker', 'chance' => 0.3, 'pieces' => ['cryptstalker-helmet', 'cryptstalker-shoulders', 'cryptstalker-chest']],
    ],

    // Bags: a boss of this zone or later may drop one, for a logged-in player, of one of the sizes
    // its zone gives. It goes on at once, into a free bag slot or in place of a smaller bag (the
    // bags are both hunters', as bought ones are); none drops that would be no bigger than every
    // bag already on.
    'bags' => [
        'from_zone' => 4,
        'chance' => 0.1,
        'sizes' => [
            4 => [6, 8], 5 => [6, 8],
            6 => [8, 10], 7 => [8, 10],
            8 => [10, 12], 9 => [10, 12], 10 => [12, 14],
        ],
    ],

    // The Bindings of the Windseeker, Left and Right, that Thunderfury is made from
    // (config/crafting.php): besides its item, the boss of the ninth zone may drop the Left, the
    // tenth's the Right, into the bank of the hunter whose boss it was. One of each to a
    // hunter: none drops for one who has it already, or has made the blade.
    'bindings' => [
        'left_zone' => 9,
        'right_zone' => 10,
        'chance' => 0.03,
        'left' => 'left-binding-of-the-windseeker',
        'right' => 'right-binding-of-the-windseeker',
        'makes' => 'thunderfury',
    ],

    // The early bosses drop more: in a normal game, a boss of these zones drops this many of its
    // zone's own green and blue gear (config/gear.php "zone_items") besides its item, so that
    // a few runs dress a hunter well enough to go on. Each is a piece his side's hunter does not
    // have yet (any once he has them all; never the same one twice in a kill), of a rarity by
    // these chances where he lacks one of it. They are his as the gear his creatures carry is.
    'extras' => [
        'zones' => [1 => 2, 2 => 2, 3 => 2],
        'chances' => ['uncommon' => 0.85, 'rare' => 0.15],
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

    // What a boss drops besides its own three items, by rarity: the regional gear of its zone
    // and the epics that used to fall, each with its weight against the boss's own item of that
    // rarity ("native_weight"). One item a kill, as ever: first the rarity, then by weight among
    // the boss's own and these. Only gear that is in the game (Gear::catalog) can drop; the
    // rest waits for its art.
    'native_weight' => ['uncommon' => 4, 'rare' => 3, 'epic' => 4],
    'pools' => [
        'garrick-padfoot' => [
            'uncommon' => ['northshire-vineyard-bow' => 1, 'abbey-road-mantle' => 1, 'abbey-copper-band' => 1, 'vintners-field-compass' => 1],
            'rare' => ['vinekeepers-prayer-charm' => 2],
        ],
        'hogger' => [
            'uncommon' => ['riverpaw-skinning-knife' => 1, 'eastvale-barkcloth-cape' => 1, 'gnollhide-trail-pendant' => 1, 'woodcutters-whetstone' => 1],
            'rare' => ['riverstone-hunters-band' => 2],
        ],
        'bazil-thredd' => [
            'uncommon' => ['stockade-lockbreaker' => 1, 'prisoners-smuggler-cape' => 1, 'stockade-iron-signet' => 1, 'broken-shackle-pendant' => 1],
            'rare' => ['confiscated-lockpick-roll' => 2],
        ],
        'edwin-vancleef' => [
            'uncommon' => ['dustfield-watch-cape' => 1, 'harvest-cog-ring' => 1, 'defias-signal-medallion' => 1, 'golem-governor-spring' => 1],
            'rare' => ['westfall-field-repeater' => 2],
        ],
        'gath-ilzogg' => [
            'uncommon' => ['redridge-blackiron-glaive' => 1, 'blackrock-rivet-band' => 1, 'shadowhide-tooth-torque' => 1, 'raiders-signal-whistle' => 1],
            'rare' => ['lakeshire-watchcloak' => 2],
            'epic' => ['quick-strike-ring' => 1, 'circle-of-applied-force' => 1],
        ],
        'stitches' => [
            'uncommon' => ['raven-hill-watchknife' => 1, 'nightwatch-mourning-cape' => 1, 'raven-hill-mourning-band' => 1, 'gravewatch-vigil-token' => 1],
            'rare' => ['nightwatch-silver-charm' => 2],
            'epic' => ['brutality_blade' => 1, 'dalrends' => 1],
        ],
        'chieftain-nekrosh' => [
            'uncommon' => ['menethil-marsh-harpoon' => 1, 'harbor-oilskin-cape' => 1, 'bluegill-shell-pendant' => 1, 'stormbound-loadstone' => 1],
            'rare' => ['tideglass-mariners-band' => 2],
            'epic' => ['maladath' => 1, 'onslaught' => 1],
        ],
        'fozruk' => [
            'uncommon' => ['fallen-keep-warcloak' => 1, 'broken-keep-signet' => 1, 'highland-watch-medallion' => 1, 'boulderfist-cairn-stone' => 1],
            'rare' => ['stromgarde-oathblade' => 2],
            'epic' => ['crulshorukh' => 1, 'drakefangtalisman' => 1],
        ],
        'king-bangalash' => [
            'uncommon' => ['stranglethorn-trackers-bow' => 1, 'canopy-stalkers-cape' => 1, 'bloodscalp-jade-band' => 1, 'jungle-amber-necklace' => 1],
            'rare' => ['jungle-trackers-fetish' => 2],
            'epic' => ['ashkandi2' => 1],
        ],
        'vile-priestess-hexx' => [
            'uncommon' => ['vilebranch-ritual-knife' => 1, 'highpeak-copper-signet' => 1, 'stormfeather-amulet' => 1, 'hexcallers-knotted-effigy' => 1],
            'rare' => ['aerie-windguard-cloak' => 2],
            'epic' => ['ashjrethul' => 1],
        ],
        'sarkoth' => [
            'uncommon' => ['trialhunters-shortbow' => 1, 'scorpidhide-trail-cape' => 1, 'durotar-copper-loop' => 1, 'boarhide-water-flask' => 1],
            'rare' => ['trialkeepers-bone-charm' => 2],
        ],
        'zalazane' => [
            'uncommon' => ['razormane-thornknife' => 1, 'razor-hill-dustcloak' => 1, 'raptor-track-pendant' => 1, 'dustwind-trail-marker' => 1],
            'rare' => ['quillguard-bronze-band' => 2],
        ],
        'taragaman' => [
            'uncommon' => ['searing-blade-embermace' => 1, 'cinderward-hide-cape' => 1, 'cinder-rivet-ring' => 1, 'ashbound-copper-seal' => 1],
            'rare' => ['bound-ember-censer' => 2],
        ],
        'echeyakee' => [
            'uncommon' => ['ratchet-sailcloth-cape' => 1, 'dockside-brass-signet' => 1, 'saltglass-trade-pendant' => 1, 'caravan-balance-weight' => 1],
            'rare' => ['ratchet-deck-crossbow' => 2],
        ],
        'gerenzo-wrenchwhistle' => [
            'uncommon' => ['windshear-ratchet-pick' => 1, 'coppercoil-survey-ring' => 1, 'bloodfury-quill-charm' => 1, 'windshear-survey-dial' => 1],
            'rare' => ['windshear-surveyor-cape' => 2],
            'epic' => ['quick-strike-ring' => 1, 'circle-of-applied-force' => 1],
        ],
        'shadumbra' => [
            'uncommon' => ['satyrwood-longbow' => 1, 'mossveil-scout-cape' => 1, 'moonbark-silver-ring' => 1, 'satyr-horn-ward' => 1],
            'rare' => ['splintertree-moonstone' => 2],
            'epic' => ['brutality_blade' => 1, 'dalrends' => 1],
        ],
        'arnak-grimtotem' => [
            'uncommon' => ['highperch-windglaive' => 1, 'mesa-windbreak-cape' => 1, 'highperch-horn-pendant' => 1, 'echoing-mesa-chime' => 1],
            'rare' => ['turquoise-mesa-band' => 2],
            'epic' => ['maladath' => 1, 'onslaught' => 1],
        ],
        'big-samras' => [
            'uncommon' => ['foothill-watch-cape' => 1, 'foothill-steel-signet' => 1, 'frostworn-trail-charm' => 1, 'yeti-fang-scrimshaw' => 1],
            'rare' => ['hillsbrad-poachers-bow' => 2],
            'epic' => ['crulshorukh' => 1, 'drakefangtalisman' => 1],
        ],
        'khan-dezhepah' => [
            'uncommon' => ['magram-crescent-cleaver' => 1, 'shadowprey-saltcloak' => 1, 'slitherblade-coral-ring' => 1, 'seafoam-shell-torque' => 1],
            'rare' => ['centaur-waystone' => 2],
            'epic' => ['ashkandi2' => 1],
        ],
        'chief-ukorz-sandscalp' => [
            'uncommon' => ['wastewander-glass-shiv' => 1, 'dune-glass-signet' => 1, 'sunscarab-neckpiece' => 1, 'desert-survey-lens' => 1],
            'rare' => ['gadgetzan-sandrunner-cape' => 2],
            'epic' => ['ashjrethul' => 1],
        ],
    ],

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
