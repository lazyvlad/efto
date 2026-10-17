# Changelog

## 3.5.10 - 2026-10-17

### Changed
- **Every zone's own creatures**: the last 33 are painted, so each zone has its own two in
  place of the stand-ins: Defias in Stormwind and Westfall, murlocs in the Wetlands, worgen in
  Duskwood, harpies at Sun Rock, centaurs and naga in Desolace, ogres in Tanaris and more.
- **More loot from the first three bosses**: in a normal game each also drops two pieces of its
  zone's green and blue gear besides its own item, pieces the hunter does not have yet first, so
  a few runs dress him well enough to go on.

## 3.5.9 - 2026-10-17

### Changed
- **Creatures in every zone**: Stormwind, Orgrimmar and every zone after them have creatures,
  more than one kind from the fourth zone on; stand-ins from the creatures we have until each
  zone's own are painted.
- **The bot's reactions** on the game channel's posts are the guild's own: :ogino:,
  :idelazo: and the bow and arrow.

## 3.5.8 - 2026-10-16

### Changed
- **The game channel on Discord** gets a card for each game: how long it took, the coins it
  made, the bosses brought down, the best loot, links to the game's page and the high scores,
  and a picture of the bosses and the loot under it. The guild's bot reacts to each post.

## 3.5.7 - 2026-10-16

### Fixed
- **Games played as a guest** show under the account's name once brought over, on the high
  scores and everywhere else; a migration renames those brought over before.

## 3.5.6 - 2026-10-16

### Changed
- **Faster swings**: one-handed weapons swing every 1.4 seconds, two-handed every 2.6.
- **Damage by weapon class**: daggers hit lightest and maces hardest of the one-handers;
  staves, polearms, greatswords and greataxes, in that order, of the two-handers.
- **A slimmer swing timer**: a thin bar centred under his health and arrows, counting down
  its seconds and showing the weapon's swing time when ready; smaller numbers beside all three.

## 3.5.5 - 2026-10-16

### Fixed
- **Loot from creatures and bosses** no longer shows for a moment as a bare glow: it pops out
  once its picture is ready, fetched ahead where it can be.

## 3.5.4 - 2026-10-16

### Changed
- **Longer zones**: every level takes 20 seconds more, so the first boss comes after about a
  minute instead of 23 seconds, and the last zones last about 3 minutes.
- **Creatures give experience**: bringing one down counts as a few seconds of catching (more
  for a bruiser).
- **More creatures**: they come more often, up to three at a time (four in Westfall), the first
  sooner into a zone.
- **Longer melee reach against creatures**: the hunter strikes a creature as it comes down and
  knocks it back before it can pounce. Against bosses his reach is unchanged.

### Fixed
- **The site's tests can no longer empty a real database**: they refuse to run while the
  configuration is cached.

## 3.5.3 - 2026-10-16

### Fixed
- **No pictures in the game after deploying 3.5.2** without caching the configuration again:
  a missing `GAME_ASSET_URL` setting now means the pictures come from this server.

## 3.5.2 - 2026-10-16

### Changed
- **The game's pictures and sounds come from Amazon S3** (the bucket efto-input-assets) once
  production's `GAME_ASSET_URL` is set, instead of from this server. Before each release
  `scripts/upload-game-assets.sh` sends the new and changed ones.

## 3.5.1 - 2026-10-16

### Changed
- **The big cats stay up top longer**: more throws and a row between their ambush and side
  charge, and after either one a boss stays up top at least 7 seconds before the next. They
  are up to be shot about 80% of the fight, from little more than half.
- **Meleeing a charging boss has a price**: when the charge lands, a hunter within reach
  beside its lane takes 40% of its damage.

### Fixed
- **Rows of daggers**: spaced by the hunter's size again, so the smaller hunter no longer fits
  between them, only in the gap the boss leaves.
- **Charges** hurt across their full lane again, not just the narrower body of a smaller boss.
- **Thunderfury** is held by its handle, not beside it.

## 3.5.0 - 2026-10-16

### Added
- **The ambush**: Edwin VanCleef vanishes, and the ground where the hunter stands is marked while
  a row of room opens above it, lit green. Rise into it: he strikes up out of the ground, then
  marks where the hunter has gone and backstabs there; step out of that mark.
- **The side charge**: Gath'Ilzogg leaves the top and a lane is marked along the ground. Rise into
  the room it opens as he dashes across from the far side (a hit is massive), then step out of
  the mark where he strikes next.
- **Stitches' hook**: a red mark where the hunter stands, and exactly half a second later the
  hook flies there. Caught, he is dragged in under Stitches, held and hit. New art from the art
  agent: the hook, its chain, and Stitches throwing it.

### Changed
- **The big cats** (King Bangalash, Echeyakee, Shadumbra) drop their plain charge for the ambush
  and the side charge, between their throws.
- **Movement**: the hunter can always rise a third of his own height, so melee can reach, and
  dodging no longer widens his room (the Dodge Area stat is gone). In a boss fight his head is
  kept well below the boss, whatever the window's size. Dragon Cry still frees him.
- **The hunter and the bosses are drawn smaller** on anything but a phone (80%), for more room
  between them. Everything else keeps its size, and speeds are unchanged.
- **Everyone starts over**: the players so far were testing, so every hunter goes back to his
  starting clothes, without gear, materials, bags bought, coins or bosses beaten. Games, scores
  and boss fights stay on record.

### Fixed
- **Dragon Cry is no way out of a mark**: a mark where the hunter stands reaches up to him,
  wherever he flies.

## 3.4.0 - 2026-10-16

### Added
- **The Frost Trap**: a new power-up, falling where a zone has creatures. Caught, it sets three
  traps across the field where the creatures come down. A creature that walks into one is held
  in a patch of frost for six seconds (it cannot close in or pounce; a pounce already in the air
  still lands). Untriggered traps stay for the whole game. At most six on the field: one that
  cannot set all three falls on.
- **Help in boss fights**: every 8 to 14 seconds of a fight, Haste, Power Word: Shield or Reverse
  Gravity falls. Reverse Gravity sends what the boss throws flying up. The shield a fight drops
  takes one hit and lasts two seconds.
- **How the game runs on players' machines**: one game in twenty quietly sends a summary of its
  frame rate and the device every 30 seconds of play; Admin → Performance gathers them by device.

### Changed
- **The in-game panels, redesigned**: a slim strip top left (name, level bar, score, chips for
  coins and full bags), the set you wear most of top right, your stats on I and what you wear on
  G, the last finds fading out under the top left, one row for everything with a timer, and
  nothing written across the field. They sit beside the field, or just inside its corners, at
  any window size.
- **Set pieces only drop from bosses**: they no longer fall from the sky.
- **Creature pictures are decoded before they are first drawn**, so a zone's first creature no
  longer costs a stutter.

## 3.3.1 - 2026-10-15

### Fixed
- **The Onslaught Girdle on the Horde hunter**: repainted by the art agent to sit on his waist,
  its shield buckle whole and in front of his warcloth, in melee as well as standing.

## 3.3.0 - 2026-10-15

### Added
- **Guests keep what they find**: a guest plays on an account of his own, known by a key his
  browser keeps. Gear, set pieces, his 36, the bank and materials are his, as an account's are;
  he earns coins but spends them once he signs up. Coming back he is welcomed to the session he
  is continuing, or starts fresh. Signing up keeps everything; logging in to an account he has
  offers to bring it along, each hunter's to his own. A guest session not played for a week is
  let go.
- **Gear in the bags**: besides his 36, gear can be kept in the bags, a slot a piece (room a
  material could have had). On the Bags tab a piece picked on him, in his 36 or in the bags
  can be put on, sent to his 36, the bags or the bank, or (worn) switched for a piece that fits
  where it is; All to bags takes everything off at once. The bank's gear is shown beside its
  materials. Caught gear goes into the bags when his 36 are full.
- **The gear of every zone**: 42 more regional items from the art agent (rings, necks,
  trinkets, cloaks and weapons), so every zone on both sides has gear of its own. The items page
  lists them zone by zone.

### Changed
- **Bosses drop the epics; the zones' gear falls**: Ashkandi, Ashjre'thul and the other epic
  and special weapons and jewels no longer fall from the sky. The bosses of the later zones drop
  them now and then in place of their own purple, and every boss may drop its zone's gear in
  place of its own item. What falls instead is the gear of the zone being played: its greens
  now and then, its blues more rarely.
- **Set pieces in two halves**: each set's first boss drops its smaller pieces, the second its
  larger (Giantstalker 50%, Dragonstalker 40%, Cryptstalker 30%).
- **The large quiver drops from the fourth zone**, and the **Bindings of the Windseeker** drop
  at last: the Left from the ninth boss, the Right from the tenth, 3% of the time.

## 3.2.0 - 2026-10-15

### Changed
- **Set pieces rarely fall from the sky**: pieces of the three hunter sets fall a tenth as often
  as they did, and a game offers no more than two of them. They come from the bosses instead.

### Added
- **Bosses drop set pieces**: from the fourth zone a boss may drop, besides its item (30% of
  the time), a piece of its zone's set that its hunter does not have yet: Giantstalker in zones
  4 and 5, Dragonstalker in 6 and 7, Cryptstalker in 8 to 10. It pops out of the boss and goes
  on like one caught. The items page says which bosses drop which set.
- **Bosses drop bags**: from the fourth zone a boss may also drop a bag (10% of the time),
  bigger in the later zones, from 6 slots up to 14. It goes on at once, into a free bag slot or
  in place of a smaller bag, and its room counts in the same game. None drops that would be no
  bigger than every bag already on.

## 3.1.0 - 2026-10-15

### Changed
- **His 36 hold all the gear he carries besides what he wears**: his starter clothes were
  "always with him" but in none of his lists, so a piece taken off showed nowhere. What he
  wears is with him and takes no room; taken off, a piece goes into his 36 (or, with his 36
  full, to the bank), ready to be put on again; put on, it frees its place. The Bags screen
  shows what he wears above his 36. A guest has his 36 too (with no bank, all he has is with
  him).

### Fixed
- **What a guest takes off stays off**: a one-time repair of outfits left bare by an older
  version put his starter clothes back on whenever his outfit was read again.

## 3.0.20 - 2026-10-15

### Changed
- **Short blades are thrust, not swung**: with a dagger or a shortsword (Pajama Hunter
  Shortsword, Cruel Barb, Vilebranch Soul Dagger) the hunter held it like an axe, his arm
  folded across his chest, and cut sideways under what came down at him. He holds it out at his
  side now, draws back a little, and thrusts it up at the creature. Timing, damage and cooldown
  are as they were. Following the art agent's review of the swings on dev2.

## 3.0.19 - 2026-10-15

### Added
- **A swing timer**: under the hunter's feet, below his health and his arrows, a third row with
  his weapon and a bar that fills as his next swing comes ready, glowing when it is (with the
  seconds left until then). Step in and strike when it is ready, and away while it fills.
- **A piece put on by itself says so**: caught and put on in a free slot, it is named, with
  where it can be changed: the character sheet (C).

### Changed
- **A boss's loot pops out of it** as it falls, as a creature's does, to be caught. It is his
  already (the site gave it as the boss fell): missed, it is his all the same.
- **Creatures stay when a boss comes**, and fight on beside it; no more come until it is down.
- **A blow of his weapon knocks a creature back**, as far as three arrows, and breaks off its
  pounce.

### Fixed
- **Gear caught goes with the hunter**: a piece caught in a game (a set piece, a weapon, a
  zone's item) or dropped by a boss was put on him, but never joined his 36: worn, yet in none
  of his bags, and taken off again the next time he was dressed. It now goes into his 36 while
  there is room, in the game at once and on the site as the game ends; with his 36 full it
  waits in the bank, and is not put on (only what he carries can be worn). What he wears is
  saved again once the game is recorded, so a piece put on during it stays on.

## 3.0.18 - 2026-10-15

### Added
- **The creatures carry their zone's own gear**: ten new items, five for each starting zone.
  Northshire Abbey: Abbey Copper Band, Vinekeeper's Prayer Charm, Vintner's Field Compass,
  Abbey Road Mantle and Northshire Vineyard Bow. Valley of Trials: Durotar Copper Loop,
  Trialkeeper's Bone Charm, Boarhide Water Flask, Scorpidhide Trail Cape and Trialhunter's
  Shortbow. The site decides which creatures carry one: in the first zone, three of its five
  for every game that passes through, all different; brought down, the creature drops it with
  the rest of its loot. It never falls from the sky. What is caught belongs to the hunter who
  caught it, as any gear found in his games; either hunter's body can wear it. A creature sent
  away by a boss hands what it carried on to the next.
- New cloaks go behind the quiver, as they should.

### Fixed
- **A guest is never left bare**: an outfit kept in the browser with pieces the player does not
  own (an account's, played as a guest in the same browser) put nothing in their place, and the
  hunter stood in his underclothes; the outfit was then kept so. A guest's empty slots, and any
  holding what he does not own, now get the clothes he starts in. An account's outfit and what
  it hides are no longer copied into the browser (a guest playing there afterwards was dressed,
  and hidden, as the account was); logging in clears what older versions left.
- **An account is never left bare either**: a piece chosen that it no longer owns (or never
  did) leaves the clothes the hunter starts in in its slot.
- **The Alliance starter boots fit**: the left one sat off the foot, showing a grey sock.
- **Redrawn clothes and creatures show at once**: their pictures were fetched by the game's
  version alone, and a browser kept an old one (the server says nothing of how long to keep
  them) until the next version. They are fetched by the build now.
- **The starter weapons have their own art**: a plain shortsword and a plain handaxe,
  carried on the back and swung in the fist, in place of the borrowed Cruel Barb and Embalmer's
  Cleaver (the Horde one stood upright beside the hunter).



### Added
- **Creatures**: each zone's own wildlife, a small fight of its own, hand to hand. A creature
  comes in at the top of the field, stalks there, and closes in on the hunter as its time
  runs (a thin bar under its health shows how close); every arrow that strikes it pushes it
  back, and reverse gravity throws it about. Once on him it stays: it follows him about and
  every couple of seconds pounces where he stands (it gathers itself first: step aside), for a
  bite that never kills. It leaves only when it is killed, by arrows or his weapon, and then
  leaves loot that hops out of it to be caught. Arrows strike it a little outside its painted
  body. Points for each one killed. Two at a time (Westfall three), and none come during a
  boss fight. In the zones painted so far: Northshire Abbey (Timber Wolf, Kobold Worker), Eastvale
  (Prowler), Westfall (Harvest Golem), Valley of Trials (Scorpid Worker, Mottled Boar) and
  Razor Hill (Bloodtalon Raptor).
- **Both hunters start with a weapon**: the Alliance hunter a Pajama Hunter Shortsword, the
  Horde hunter a Horde Hunter Handaxe (one-handed, so an offhand stays), since melee needs
  something in the main hand. Outfits saved before had an empty hand: the weapon was put in
  it, once; put down after that, it stays down. Drawn for now as the Cruel Barb and the
  Embalmer's Cleaver, until they have art of their own.
- **Thunderfury's lightning** goes off with a blow of the weapon as well as with arrows, and
  strikes the creatures nearest him too.
- **Melee**: up close the hunter fights with his main-hand weapon. When a creature closes in
  on him, or a boss charges or rushes down at him, he takes the weapon off his back and swings
  on his own; arrows go on as ever. A blow does 14 (a two-hander 22), plus his attack power,
  and can crit; it breaks off a creature's pounce. After a
  swing he must wait, 2 seconds with a one-handed weapon and 3 with a two-handed one: in, a
  blow, and out again. A blow lands on what he swung at even if it has moved on a little,
  so a boss charging past him (dodged, he stays close) still takes it. A boss's shield takes a
  blow as it does an arrow. Whatever he wears:
  every chest, shoulders, bracers and gloves (the three sets, the boss drops and the clothes he
  starts in) moves with his arms. Every main-hand weapon can be swung, one-handed or two as it
  is worn; as he takes it off his back it stays behind him until it has turned clear of his
  face.

### Fixed
- **Smoother play**: the panels around the field (stats, set progress, spell bar) are no longer
  laid out and repainted, along with the whole page, every few frames: their text is set only
  when it changes, each has a layer of its own, and they no longer blur what is behind them
  (barely visible behind their dark backgrounds, and redone every frame over a moving field).
  A Chrome recording showed these repaints as the 30 ms stalls behind dropped frames. The
  hunter fighting hand to hand is also drawn from pictures kept on the graphics card.

### Changed
- **Multishot has diminishing returns on a boss**: of one Multishot's arrows, the first three
  that land do full damage, the fourth a quarter, the fifth a twentieth, and any after that
  nothing. From right under a boss, or as it charges down at the hunter, all five used to land
  in full. Going in close is still the strongest play.
- **The two big cats are no easier to hit than the other bosses**: King Bangalash and
  Shadumbra are drawn wider than the rest, and arrows landed on far more of them; their bodies
  now take up a narrower share of their pictures.
- **Debug mode records where a boss's damage comes from**: by kind of shot, crits,
  Thunderfury, what landed while it charged, and the arrows it dodged or its shield took.
- **Power Word: Shield has charges**: it blocks 3 hits or lasts its time, whichever runs out
  first. A creature's bite uses 1, a bruiser's (Kobold Worker, Harvest Golem, Mottled Boar) 2.

## 3.0.16 - 2026-10-15

### Changed
- **Necklaces sit on the neck**: Hogger's Chewed Collar, Bangalash's Fang, Darkspear Voodoo
  Charm, White Lion Fang and Shadow Panther Fang were drawn as whole loops across the chest;
  now only the front cord shows, fitted to each hunter's neckline (the Horde hunter's moved
  over onto his neck). The Horde bone amulet was already right.
- **The Bindings of the Windseeker have their own icons**: a matching left and right cuff,
  in place of Thunderfury's picture.

## 3.0.15 - 2026-10-15

### Changed
- **The admin section is in categories**: Overview, then Players (Accounts, Games), News
  (What's new, Announcements), Game (Settings) and Tools (Performance), as tabs, with the open
  category's pages under them; each page's title says where it is ("Players › Accounts"), and
  the Overview has a guide to every page.
- **The site's menu is in categories too**: Play, Scores (High Scores, Live, My Games) and
  Guide (What's new, Items, About). A category opens its first page, and its other pages are
  tabs under the page's heading; a game's own page counts as High Scores. On phones the menu
  lists each category with its pages.

### For developers
- `App\Support\AdminMenu`: the admin's pages by category, for the menu and the Overview; a
  new page goes in there.
- `App\Support\SiteMenu`: the same for the players' pages (top bar, tabs, phone menu).

## 3.0.14 - 2026-10-15

### Fixed
- **Debug mode can be turned on from the home page**: `?debug=perf` (and `?debug=off`) on the
  site's home page is passed on to the game in its frame; it only worked on /play before.

## 3.0.13 - 2026-10-15

### What's new
- **Debug mode for measuring how the game runs**, for the admins: open the game with
  `?debug=perf` while logged in (it stays on in that browser; `?debug=off` turns it off). A
  badge in the corner shows the frame rate, and every five seconds of play a summary goes to
  the site: frames a second, frame times (median, 95th and 99th percentile, worst, how many
  were slow), how much went to the game's logic, to drawing and to drawing the hunter, what
  was on screen and happening, and the browser and graphics card. Admin → Performance lists
  the recordings and each one's samples.

### Changed
- **Health and arrows under the hunter's feet, in two rows**: a heart, his health bar and his
  health as a number; then the arrows, his quiver in segments, one for each 50 arrows it
  holds (8 with the large quiver), and the count. Both fill and empty at a glance, and turn
  amber, then red, as they run low; the quiver glows when a quarter or less is left.

### Fixed
- **No more hitches from the mouse**: the game measured where its canvas was on the page on
  every report from the mouse, which a gaming mouse sends up to a thousand times a second, and
  each measurement after the page had changed made the browser lay the whole page out again.
  It is measured once now, and again only when the window is resized or scrolled. Debug mode
  records the mouse too: reports a second, the most in one frame, and the slow frames with and
  without one.
- **Smoother play**: Thunderfury's lightning, the low-quiver glow and the effect icons no
  longer use canvas blur shadows, which are slow enough in the browser to drop frames, and
  the gear icons of what falls are fetched before the first one falls.

## 3.0.12 - 2026-10-15

### Changed
- **The arrows in the quiver show beside the hunter's health bar**, on the field: an arrow and
  what is in the quiver out of what it holds ("11/200"), amber when a quarter or less is left
  and red when it is empty.

### Fixed
- **The large quiver says what it gives**: in the inventory and on the character sheet the
  Ancient Sinew Wrapped Lamina read "No stats"; it says "Quiver: holds 400 arrows (+200)" now,
  for either hunter.
- **No square frame round the helpful spells that fall**: Frost Nova, Power Word: Shield and
  the speed boost fell inside a light blue, gold or red square; they fall as they are now,
  with the glow every helpful thing has (3.0.8 took the frame off their icons in the list of
  effects, not off the falling spells).

## 3.0.11 - 2026-10-15

### Changed
- **Thunderfury's lightning strikes far more often**, as a legendary's should: 35% each time
  arrows are loosed (was 12%), as soon as 0.8 seconds after the last (was 2), and at up to 4
  harmful things (was 3). Against a boss it does 20 (was 60) but strikes about every two
  seconds, so the boss stays dazed, attacking slower, for most of the fight.

### Fixed
- **The weapons and jewellery that fall in a game show their new icons**, falling and in the
  inventory and on the character sheet: Ashkandi, Brutality Blade, Maladath, Crul'shorukh,
  Dal'Rend's and Ashjre'thul had kept their old falling-loot pictures (Ashkandi's with its
  border) though they were given icons of their own in 3.0.3, and the rings, capes, the
  Walking Stick, Onslaught and the Drake Fang Talisman now fall as their gear icons too.

### Changed
- **Five more weapons are slung across the hunter's back** instead of standing up beside
  him: Hogger's Trophy Axe, Gath'Ilzogg's War Axe and Crul'shorukh with their heads down
  behind him, Abomination's Hook grip up and hook down, and the Walking Stick diagonally
  with its glowing head over his shoulder.

## 3.0.10 - 2026-10-15

### Changed
- **Gear has item levels**, as in World of Warcraft. What a piece gives comes from its item
  level and the kind of slot it is worn in, not from its rarity, so two pieces of the same
  level and kind are as strong as each other. A boss's green is its zone's level (10 for the
  first zone, 5 more for each zone after), its blue one step up and its purple two: a zone's
  green, the zone before's blue and the one before that's purple are all of a level. The
  weapons and rings that fall in a game have levels of their own (Ashkandi 55, Dal'Rend's 45),
  Thunderfury 80. The level shows on the character sheet, in the Gear tab and on the Items
  page. Weapons from item level 40 put some of it into crit; trinkets into carrying (blue
  items no longer help with carrying on their own). Gear you own keeps its place but gives
  what its level gives now: early blues and purples a little less, late greens more.
  Thunderfury is +13 attack power and +1% crit now, still the strongest weapon.
- **Thunderfury has its looks**: its split blue blade carried across the hunter's back, grip
  over the shoulder, on both hunters, and an icon of its own.

### For developers
- `item_levels` in config/gear.php (first_zone, per_zone, rarity_steps, points_per_level,
  cost, mix, weapon_crit_from) replaces `budget`; `item_level` (and `mix`) on `drops` and
  `crafted`; `Gear::bossItemLevel`, `Gear::statsFor`, `Gear::statPoints`; the catalog's
  `itemLevel`.

## 3.0.9 - 2026-10-15

### Changed
- **The Bindings of the Windseeker no longer drop**, from any boss: they will drop in the zones
  still to come. Thunderfury and its recipe stay in the game, waiting for them.
- **An admin can give Thunderfury** to either hunter on its own (the account page, under each
  hunter's Gear), to try it out, and take it back. It is worn like any weapon, from the
  character sheet's main hand.

### What's new
- **Parses**, as the WoW log sites have them. Every timed boss kill is set against every
  other kill of that boss in the same version of the game, by how long the fight took, and
  given a number: the share of those kills it beat, 100 for the fastest, 0 for the slowest. It
  is shown in the colours the log sites use (grey, green, blue, purple, orange, pink, gold for
  the very best) in every game's boss fights, on My Games and on its page from the high
  scores, and Boss records gives each hunter's best parse against each boss. Parses move as
  others play.

### For developers
- `App\Support\Parses` (`of`, `percentile`, `color`): worked out when asked, from the timed
  kills not given by an admin, by boss and `games.version_rank`.

## 3.0.8 - 2026-10-14

### What's new
- **Thunderfury, Blessed Blade of the Windseeker: a legendary to make.** The last three bosses
  of each side (zones 8 to 10) may now drop a **Left** or a **Right Binding of the
  Windseeker**, besides their item: into the bank of the hunter whose boss it was, bound to
  him. With both, 10 Fiery Core, 10 Lava Core and 4 Essence of Water in his bags, he makes the
  blade on the Crafting tab: a one-handed sword for the main hand, +22 attack power and +2%
  crit, his for good, one to a hunter. Worn, his arrows may call down its **lightning** (12%
  each time he shoots, at most every 2 seconds): it destroys up to 3 harmful things falling
  near him, and in a boss fight strikes the boss for 60 and dazes it, so it attacks slower for
  4 seconds. A boss's shield takes the damage, not the daze. Its own picture is being painted;
  for now it borrows the Thunder Fury's.

### Fixed
- **Effect icons without a box.** Cut-out pictures on the screen's effect list and notices,
  such as the Frost Nova crystals for frozen time and the Power Word: Shield, are no longer
  drawn on a dark square with a coloured frame round them; they stand on their own. Square
  painted icons keep their frame.
- **Upheaval can be dodged.** The attacks from the sides flew along the hunter's band, which
  his figure fills top to bottom: there was no getting out of their way. Now everything in an
  Upheaval comes through the ground in columns. Those from the sides are hurled in high up,
  stop over their column and drop straight down through it, as the others rise up through
  theirs. Every wave marks its columns on the ground first, purple, and leaves one **green**
  column clear, near enough to reach in time even on a keyboard; stand in it. One wave comes
  at a time: the next is marked only once the last has gone through (it was possible for two
  to come at once, each with its own clear column). Frost Nova and slowed time hold it too.

### What's new
- **Live games**: a new page (Live, in the site's menu) with every game being played right
  now: who, which side, the mode, the level and zone, the score so far, how long they have
  been playing, the bosses down, and the boss being fought with the health it has left. It
  keeps itself up to date while it is open. A game tells the site how it is going every half
  a minute of play, and when a boss goes down.
- **The Gear tab sorts gear by kind.** Both lists, with your hunter and in the bank, are
  grouped under headings in the character sheet's order: Head, Neck, Shoulders and on down,
  Rings and Trinkets together, then two-handed and one-handed weapons, the off hand, ranged and
  quivers, each with how many there are. Picking a run with Shift follows the order shown.
- **A game that ends in a boss fight says so.** Fell to Hogger, or left the fight, with how
  long it lasted, the arrows spent, the damage taken and how much the boss had left ("Hogger
  at 40%"): the last row of the game's boss fights, on My Games and on its page from the high
  scores.

### For developers
- Thunderfury: `crafting.items` may be `gear` (made once, into the gear ledger's `crafted`,
  `Gear::addCrafted`) or `bound` (never sent); `gear.crafted` in config/gear.php;
  `boss_loot.bindings`, `BossLoot::rollBindings`, `Bags::deposit`; the boss report answers
  `bindings`. In the game `bosses.thunderfury`, `strikeBoss()` in bossSystem.js,
  `spellSystem.onArrowsFired`, `classes/LightningBolt.js`; legendary is orange.
- `planUpheaval()` (`utils/upheaval.js`) times the waves (`markAt`, `sendAt`, `clearAt`) and
  keeps each clear column within the hunter's reach; `flyStep()` moves what it sends (also in
  `BossProjectile`). Boss lab `--casual` stands in each clear column, walking at the hunter's
  speed, and reports "upheaval hits" (none in 26 Upheavals with Hogger and Taragaman).
- `games.last_fight` (from `bossFight` in the finished game: boss, seconds, bossHealth,
  arrows, damage, hits; `fightInProgress()` in `bossSystem.js`); `games.last_seen_at` and
  `games.live` (from `progress` with each chunk request), `Game::live()`, `/live`
  (`?list=1` for the list alone).

## 3.0.7 - 2026-10-14

### Changed
- **The high scores are grouped by version of the game, the latest on top.** Each version has
  a heading of its own and its scores ranked best first under it, counted from 1, so a new
  version's first scores are not set against an older one's. Scores from before games kept
  their version come last. The game's own high scores are grouped the same way, and where a
  score lands ("#2 on the high scores of version 3.0.7", in the game and on Discord) counts
  among its version's.
- **Each score says the side** it was played for: Alliance or Horde, in its colour, on the
  site and in the game's own high scores.
- **Every game on the high scores has a page of its own, for anyone to see**: press the score.
  It shows who played it and for which side, the version, the gear worn, the score, level and
  time, and every boss fight: how long it took against its par, the points it paid with the
  speed bonus, the arrows spent, the damage taken and what dropped. My Games links a game to
  its page when it is on the high scores.

### For developers
- `games.version_rank` (`Game::versionRank()`: "3.0.6" is 3000006), kept when a game is saved
  and filled in for the games before it; `Score::top()` orders by it, and `Score::rankOf()`
  is a score's place among its version's. `/game/{id}` (`games.show`, by id: a game's token
  stays private) shows a game that has a score; the scores the game reads carry `faction`.

## 3.0.6 - 2026-10-14

### What's new
- **Upheaval: a new kind of boss fight.** Taragaman the Hungerer now turns gravity over: for
  a few seconds his flame bolts come at you from every side, not just from above. They rise
  out of the ground in a row of columns, and fly in from the left and right along the high or
  low half of the ground you move on. Each wave is marked before it comes: purple columns on
  the ground with a green one left clear, or a purple lane with arrows on the edge it comes in
  at. Every wave leaves a way through: stand in the green column, or move to the other half of
  the ground. He holds his other attacks while it lasts. It is his second attack, so you meet
  it in every fight with him; he is no longer the third caster in a row on the Horde side.
- **Hogger calls on his gnolls**, on the Alliance side: his thrown axes come at you the same
  way, from the ground and both sides, as his second attack, between his throws, his rush and
  his row. **Garrick Padfoot** fights the way Hogger did: throws, a rush down the field and a
  row.

### Changed
- **The inventory says whose it is.** Its top shows the hunter's side, in its colour, and his
  name ("Horde hunter · Lazyvlad's inventory"), with Alliance and Horde buttons to switch
  between the two between games, as on the character sheet. The purse says it is both
  hunters'.

- **My Games is each hunter's own, with how every boss fight went.** Pick the Alliance or the
  Horde hunter at the top (it opens on the one you played last). For him: his games, best
  score and time played; **Boss records**, his best against each boss of his side (kills,
  fastest time against par, most points, fewest arrows, least damage taken); and every game
  opens to its boss fights: how long each took against its par, the points it paid with the
  bonus for speed, the arrows spent, the damage and hits taken, and what dropped. Then his boss
  loot, sets, rare items and the large quiver. The game's own Loot screen shows the collection
  of the hunter being played. Fights are timed from this version on.

### Fixed
- **Unlocking everything for a player** (admin) gives each hunter everything he can have:
  every zone of his side, one of every piece of his side's boss loot and of the gear that
  falls in games (it gave only one piece from each boss, and none of the rest), every set, and
  the large quiver to both hunters (it went to the Alliance hunter only). The admin's account
  page shows each hunter apart, and sets, gear and the quiver are given and taken back for one
  hunter at a time, or everything for one or both.

### For developers
- `utils/upheaval.js` plans the waves (`planUpheaval`); `bosses.upheaval` in
  `config/gameConfig.js`; the `warper` and `packleader` behaviours, and a boss's `upheaval`
  (what its notice says it does); a `BossProjectile` with `flight: { vx, vy }`
  flies straight on instead of falling.
- `users.granted_gear` (`{ alliance, horde }`, `Grants::giveAllGear/takeBackGear/giveQuiver`);
  `users.granted_pieces` is kept by side (an older list is both hunters'), read with
  `User::grantedPieces($side)`. `POST /admin/users/{user}/gear`; the set, quiver and unlock
  routes take `side`.
- A boss kill reports how the fight went (`fight`: seconds, points, speedPoints, par, arrows,
  damage, hits), kept on `boss_drops` (`fight_seconds`, `points`, `speed_points`,
  `par_seconds`, `arrows_used`, `damage_taken`, `hits_taken`). `App\Support\HunterRecord`;
  `/my-games?hunter=`, `/api/collection?side=`.
- Boss lab: `--casual` (no Dragon Cry, out of the boss's reach) and `--shots <dir>` (a
  picture of the fight every half second).

## 3.0.5 - 2026-10-14

### Changed
- **Ranged weapons are slung across the hunter's back** instead of standing out beside his
  shoulder: Ashjre'thul with its stock down and its middle under his shoulder armor, the
  Pajama Hunter Bow diagonally with its lower limb by his hip, the Horde Hunter Totem close
  to his back, the Centaur War Spear point over the shoulder, and Padfoot's Throwing Dagger
  grip up behind his shoulder.

## 3.0.4 - 2026-10-14

### Added
- **Hide a piece of gear from sight.** On the character sheet, pick a slot and press *Hide it*:
  the piece is still worn and still counts for health, armor, attack power and set bonuses,
  but it is no longer drawn on the hunter, in play or on any screen. *Show it* brings it back.
  Each hunter hides his own, and a hidden piece stays hidden when it is put on again.

### Changed
- **The painted logo:** the I N P U T medallion now has a painted gold and enamel finish, in
  the game and on the site.
- **The hunters have portraits.** A high score from a player with no picture of their own
  shows the hunter they played it with, and a game posted to Discord comes with his portrait
  in his side's colour.

### Fixed
- **Redrawn art shows up right after an update**, with no need to clear the browser's cache:
  the pictures of the hunter's gear and the gear icons are fetched anew when they change (as
  Ashkandi across his back wasn't, for anyone who had seen the old one).

## 3.0.3 - 2026-10-14

### Changed
- **Arrows are what a boss fight runs on.** A game starts with 50 arrows (was 100), a boss
  fight with 100 (was a full quiver), and arrow bundles fall in a fight every 10 seconds (was
  5). Spare arrows kept in your bags still fill the quiver as a game starts.
- **The bosses have less health**, so a fight no longer drags on: 800 for the first (was 1300),
  150 more with each zone, about 2150 for the last.

- **Six weapons have icons of their own** in the inventory and on the character sheet:
  Ashkandi, Brutality Blade, Maladath, Crul'shorukh, Dal'Rend's and Ashjre'thul, in place of
  their falling-loot pictures. **Ashkandi is carried across his back**, grip over the shoulder.

### Fixed
- Starting a game with no name, and resetting Settings, no longer use the browser's own boxes:
  the missing name is said under the box, and Settings asks before resetting everything.

## 3.0.2 - 2026-10-14

### Changed
- **The Ancient Sinew Wrapped Lamina has its looks:** moss-green dragonhide bound in ivory
  sinew, bronze leaf fittings and a fan of feathered arrows on his back, a sinew-laced harness
  across his chest, on both hunters, and an icon of its own in place of the arrows' picture.
- The Alliance hunter's tabard has an icon to match its new painting.

## 3.0.1 - 2026-10-14

### Changed
- **The Alliance hunter's tabard is painted anew:** royal blue with embroidered gold edging
  and a golden lion's head on its shield, in place of the first stand-in.

## 3.0.0 - 2026-10-14

**A new game.** Since 2.0 the hunter has become a character you dress, piece by piece, in what
you win; the Alliance and the Horde hunter are two characters with their own gear, bags and
bank, bound the way World of Warcraft binds; there are crafting, potions and a quiver to fill,
bosses that are a fight from the first, and screens that work on a phone. This is what 3.0
adds on top of the 2.4x versions before it:


### What's new
- **Haste.** The speed boost that falls no longer speeds the game up: for 10 seconds the
  hunter moves faster (following a finger; with a mouse he is already where it points) and
  Autoshot and Multishot come round sooner (0.3 seconds instead of 0.5).
- **The quiver is gear.** A Quiver slot beside the ranged weapon on the character sheet. The
  Ancient Sinew Wrapped Lamina a boss may drop is worn there (epic, for now) and doubles the
  arrows only while it is on; it counts among his 36 and shows on the gear panel. It is the
  hunter's whose boss dropped it, and each hunter can find his own. The Alliance hunter's
  starting quiver moves there from the back.
- **Two hunters, two characters.** Each has his own bags (what is in them) and his own bank;
  the purse, and the bags bought from it, are both's. Materials, potions and arrows can be
  sent from one hunter's bank to the other's (**Send**, between games). What was kept before
  is the Alliance hunter's.
- **Binding.** Boss loot, set pieces, the clothes a hunter starts in and the quiver are bound
  to the hunter who got them (Soulbound). Gear that falls in a game binds when worn: until
  then it can be sent to the other hunter from the Gear tab (**Send**). A copy worn is bound;
  the others can still go.
- **Spare arrows.** Arrows caught with the quiver full go into your bags (200 to a slot), fill
  the quiver as a game starts, and fill it again when it runs low.
- **Potions keep.** A Health Potion caught at full health, and a Mana Potion caught while
  time is already slowed, go into your bags. Drink a Mana Potion with M (or from its slot on
  the spell bar) to slow time.

### Fixed
- **The speed bonus for a boss** was always worked out as if the fight had lasted one second
  (3900 points for the first boss). It is now paid against a par time for each boss (30
  seconds for the first, 4 more for each zone): up to the boss's own score again, by how far
  under par it came down, and nothing when slower.

### For developers
- `bags.itemStacks` (game) and `loot.bags.item_stacks` (site): kinds a slot holds more of. A
  finished game reports the change in kept things that are not materials as `used` and
  `stored`; what is stored is believed up to `crafting.stored_per_minute` and the room. The
  `quiver` slot; `Gear::LARGE_QUIVER`, `Gear::quiverSides()` (from `boss_drops.quiver`),
  `Gear::quiverMoved()`; `users.bag_contents` and `users.materials` are `{ alliance, horde }`
  (`Bags::contents/bank($user, $side)`), `POST /api/bags/send`, the bag routes take `side`;
  catalog items have `binding` (pickup | equip | account), `users.gear_ledger` keeps what was
  sent and bound (`Gear::bound/sendable/send/bindWorn`), `POST /api/gear/send`, the page's
  `user.bound`; `potions['mana-potion']`, the
  `mana_potion` key; `powerUps.haste`; `bosses.speedBonus` is `{ par, parPerZone }`.

## 2.43.0 - 2026-10-14

### What's new
- **Bags keep what is in them between games.** The materials a game catches stay in your
  bags instead of going to the bank, and the next game starts with them there (they take
  their room from what it catches). Junk still sells as a game ends.
- **The bank and the bags.** The Bags tab of the inventory shows his 36 (the gear he takes into
  fights) on the left, the bags in the middle and the bank on the right: materials kept
  without limit, each moved to the bags with **To bags**. Pick a material in the bags to move
  it back **To the bank**, or **Craft with it**. The bag vendor is behind its button.
- **Crafting.** A new Crafting tab, with the first recipe: a **Health Potion** from 1
  Kingsblood and 1 Essence of Water, made from what is in your bags, into your bags. Choose
  how many (or All) and Make.
- **The gear panel shows what he has on, not what you own:** for each hunter set he wears
  pieces of, how many ("Dragonstalker 2/8, Giantstalker 3/8") and what they give at that count
  and next, then everything else on him, and what it all gives together. Its heading is the
  saved set he has on, or "What he wears".
- **Drink a Health Potion in a fight** with H (or tap it on the spell bar, where it shows how
  many are left): +40 health, one every 20 seconds.

### Fixed
- **The starting window on a phone.** The map comes first, a continent filling the screen,
  with **Kalimdor** and **Eastern Kingdoms** buttons over it to go from one to the other; its
  pins are bigger, and picking one brings up the place with the way to start. The Game menu
  no longer falls off the right of the screen (Character, Inventory, Music and Game share the
  row), and the page no longer scrolls sideways on an iPhone. On a touch screen the window
  opens at its top: the name box is no longer picked for typing, which scrolled it down there.

### For developers
- `users.bag_contents` (`{ itemId: count }`) is what stays in the bags; `users.materials` is
  the bank. `config/crafting.php` has the items and recipes (sent with the page as
  `crafting`); `POST /api/bags/move` (`item`, `count`, `to`: bags | bank) and `POST /api/craft`
  (`recipe`, `count`) answer with `bags` and `bank`. A finished game takes `used` (potions
  drunk) and answers with `bags`. `Bags::settle` counts what was in the bags against their
  room. `potions` in `game/config/gameConfig.js`, `game/data/crafting.js`, the `potion` key.

## 2.42.0 - 2026-10-14

### What's new
- **Your sets are the sets.** The three fixed Giantstalker, Dragonstalker and Cryptstalker
  buttons are gone from the character sheet: you wear what you saved. Change a piece of a set
  and press its **Save** to keep the change in that set, or **+ Save as a new set**. Each set
  can be renamed and forgotten too. Each hunter keeps up to 4 of his own; sets saved before
  this are the Alliance hunter's.
- **In play, your sets switch with 1, 2, 3 and 4** (or the keys you gave them under
  Settings), and the set panel has a button for each: the one on is lit. A tap on the panel
  while paused wears the next.
- **The set panel shows what is on as well as what is owned:** "6 on · 6/8 owned", the pieces
  worn lit, the ones owned but not on dimmed in a dashed socket, and what the pieces on give on
  a line of its own.
- Naming a set, forgetting one, selling your last of something and finishing a game early
  ask in a window of the game's own instead of the browser's.

### For developers
- `ui/gameDialog.js`: `askConfirm()` and `askText()`, in place of `confirm()` and `prompt()`;
  every key is the dialog's while it is open.
- `users.outfits` is `{ alliance, horde }` (`Gear::allOutfits`; an older list is the Alliance
  hunter's); `PUT /api/outfits` takes `side` and that hunter's whole list. The `set_4` key.

## 2.41.1 - 2026-10-14

### Changed
- **The first bosses are a fight now.** Played for the most damage (Dragon Cry, right under
  the boss, Multishot on cooldown), a fresh hunter brought a first boss down in 6 seconds;
  now it takes about 20. A boss of the first zone has 1300 health instead of 240, and less is
  added with each zone (140, was 257), so the last boss has about the same as before.
- Boss attacks hit a little harder early on: 10 at first instead of 8, about 15 at the end as
  before.
- **What hurts the hunter hits him where he is drawn.** Thrown things, a boss's charge and
  a burst used to hit a square over his head and chest: his legs were never hit, and the air
  beside his head was. Now they go by his shape, gear and all. Catching things still uses a
  box, which now reaches down to his feet, so loot is caught as easily as before, and more
  easily low down.
- **Standing right under a boss costs more.** Its swipe comes after a third of a second
  there (was three quarters) and does three times its damage (was twice).

### For developers
- `npm run boss-lab` (in `game/`, `tools/boss-lab.mjs`) plays every boss fight in the real
  game in a headless Chrome, the way a player out for the most damage would, and reports how
  long each took, the arrows spent and caught and the damage taken. `playwright-core` is a
  dev dependency for it.
- `utils/hitMask.js`: the hunter's shape as a grid, made once for each picture he wears;
  `Player.isHitBy()` tests a rectangle or circle against it, `getCollisionBounds()` (catching)
  is his box to his feet, `getBodyBounds()` his body for storms, stomps and a boss's reach.

## 2.41.0 - 2026-10-14

### What's new

**The hunter wears what you put on him**
- Your hunter is now drawn in his gear: every set piece, every piece of boss loot, the
  weapons, the capes and the starting clothes have a look of their own, on both hunters. His
  picture is put together from what he wears and changes the moment you change it: on the
  character sheet, in play, in the inventory and at the end of a game. Rings and trinkets are
  worn but not seen; nothing is drawn on the tauren's head (his cap and horns are his own).
- **Starting clothes are gear.** The Alliance hunter starts in his pajama top and trousers,
  boots, belt, bracers, grips, quiver, tabard and bow; the Horde hunter in his bone amulet, mantle,
  leather vest, bracers, grips, war belt, leggings, hoof guards, warcloth and totem. Each
  piece gives a little (+1 armor, health or attack power), comes off like anything else and
  is replaced by better gear; with a slot empty he is in plain clothes. Every player has both
  sets, for good: they are never sold and never count towards the 36 he carries.
- **Each hunter has his own outfit.** The Alliance and the Horde hunter are dressed apart:
  pick a side on the map, or press Alliance or Horde on the character sheet, and that
  hunter's outfit is the one worn and changed. What you own is shared.
- **Each hunter has his own loot.** Everything won is the hunter's who won it: his side's
  boss loot, and the set pieces and gear caught in his games. The other hunter starts from
  nothing of it, which is what levelling an alt is for. Each sells only his own, and wears
  only his own starting clothes. Loot from games played before there were two sides is the
  Alliance hunter's; what was sold then came out of his first.
- **Each hunter carries his own 36,** chosen for him alone; the inventory shows the hunter of
  the side picked. A choice made before this is both hunters', each keeping what is his.
- **Power Word: Shield looks the part:** a bubble of golden light round the hunter, with a
  glow thrown round it, a shadow under its edge so it shows on bright places too, light
  running round its rim and a gleam on top. It breathes, and flickers as it runs out.
- **A boss brought down fast is worth more.** Besides the points for defeating it, a boss
  pays 3 points for every point of damage a second done to it over the fight (its health
  over the seconds it lasted): Hogger in 20 seconds is 25 a second, 75 points more.
- **The modes are buttons with pictures** on the main menu: the place for a normal game, its
  boss for a boss fight, three of the side's bosses for Boss Rush, with its price. One that
  can't be chosen yet says why.
- An outfit saved before this is now both hunters', each in his own clothes wherever it left
  a slot empty, less what is the other side's.
- Boss loot has pictures of its own in the inventory and on the character sheet, instead of
  its boss's portrait.
- **The Alliance hunter has a tabard of his own,** the Pajama Hunter Tabard: royal blue and
  gold, with a lion's head on a shield. A stand-in until the art is painted.
- The Horde hunter's Warcloth hangs over his belt, so no belt covers its emblem.
- The capes that fall (Miner's, Wolfmaster, Woven, Traveler's), the Walking Stick (held in
  both hands) and the Emerald and Silver Bands are gear now: kept, worn, and sold when spare,
  instead of sold for coins as a game ends.
- **Wearing something from the bank.** With 36 things carried, the character sheet now says
  why a piece from the bank can't go on, right under it. Its button says **Swap in** when
  the slot holds something carried: one press puts it on and sends the old piece to the bank.
  Otherwise the button says **No room**, and **Choose what to leave** opens the inventory on
  its Gear tab.

### For developers
- The art: `game/assets/wearables/` (800px WebP, from the pack in
  `game-art/latest-for-game-agent`), `game/data/hunterArt.js` written from its manifest,
  `game/utils/hunterLooks.js` puts a picture together; icons in `game/assets/items/gear/`.
- `config('gear.starter')`; `users.equipment` is `{ alliance, horde }` (an older single
  outfit is read as both); `PUT /api/equipment` takes `side`. `Gear::catalog()` gives boss
  loot and starting clothes a `side`; `Gear::valid($user, $wanted, $side)` leaves out the other
  side's. `users.carried` is `{ alliance, horde }` too (an older single list is both's),
  read with `Gear::carriedFor` / `Gear::allCarried`. Ownership is per side: `Gear::owned($user,
  $side)`, `$user->setPieces($side)`, `users.sold` as `{ alliance, horde }` (`Gear::sold`),
  `POST /api/sell` takes `side`; the page boot's `pieces` and `gear` are by side.
- `bosses.speedBonus.perDps` in `game/config/gameConfig.js`; `speedBonus()` in `game/data/bosses.js`.

## 2.40.1 - 2026-10-14

### Fixed
- Pressing Take, Leave, Sell or a pick in the inventory no longer throws its lists back to
  the top: every list, and on a phone the whole window, stays where it was scrolled to. The
  same for "Put on" and "Take off" in the character sheet's list; picking another slot still
  starts its list from the top.

## 2.40.0 - 2026-10-14

### What's new

**Moving gear between your hunter and the bank, many at a time**
- On the inventory's Gear tab, press (or tap) things to pick them, Shift-click for a run of
  them, or "Pick all" on either list. A bar over the lists says how many are picked and moves
  them all across in one press: "Leave 5 in the bank", or "Take 14 along (room for 5)",
  which takes as many as your hunter has room for and says how many went.
- With a mouse, drag a thing (or everything picked) from one list onto the other.
- The Take and Leave buttons on each row still move one thing at a time. Picking and moving
  are between games; in a game the lists only show what was taken.

## 2.39.2 - 2026-10-14

### Fixed
- The hit sound no longer piles up in boss fights. Everything that hits the hunter in a fight
  (thrown things, rows, fans, a riot's stones, charges, stomps, hexes) shares one sound, heard
  at most about twice a second however many hits land. A storm is heard on its first hit,
  not on every tick of it, and a bomb that bursts away from the hunter is softer.

## 2.39.1 - 2026-10-14

### Fixed
- A new logo, tab icon, phone icon or share card reaches every browser on its next visit:
  their addresses now carry a fingerprint of the file ("input-logo.webp?v=561ea547"), which
  changes with the file, so no browser can go on showing an older copy it kept. The game's
  scripts and styles already worked this way; these pictures, whose names never change, did
  not.

### For developers
- `App\Support\Fingerprint::asset()` for a fixed-name file under `public/`; the game page
  fingerprints its logo, icons and manifest (`GameController::FIXED_NAMES`). The icons in
  `site.webmanifest` carry theirs by hand: after a new icon, `FingerprintTest` says which to
  update.

## 2.39.0 - 2026-10-14

### What's new

**The nimble bosses dodge**
- Garrick Padfoot, Bazil Thredd, Edwin VanCleef, King Bangalash, Echeyakee and Shadumbra are
  quick on their feet: now and then an arrow misses them altogether, 5% of them for Garrick
  up to 13% for King Bangalash. "Dodge" shows where it happens. It takes the edge off a
  Multishot fired from close by, as every one of its arrows can miss. An Arcane Shot never
  does. They say so when they appear.

**The items page, new**
- Items is in the menu along the top of the site now, beside High Scores, instead of the
  bottom bar and the account menu.
- The page is in the game's look and says what becomes of what you catch: gear is kept and
  worn, materials go to the bank, the rest is sold for coins. Then the three hunter sets with
  what each piece gives and their bonuses; every boss with each of its drops, where it is
  worn, what it gives and what it sells for; the weapons and jewellery that fall; the
  materials; and what is sold for coins, by rarity.

### Changed
- The character sheet and the inventory have Back and Close, as the game's other screens:
  Back goes to where they were opened from (the pause menu, or the map), Close shuts every
  menu and goes on with the game.
- Back on How to play, Loot & bonuses, High scores and Settings now does the same: it leaves
  their window for where it was opened from, however many of its tabs were gone through,
  instead of stepping back one tab at a time.

## 2.38.0 - 2026-10-14

### What's new

**The end of a game**
- A screen of its own: the hunter in the place the game ended, under "Game over" (or
  Victory!, Boss defeated!, Boss Rush complete!), the score on a gold-trimmed plate, and
  where it landed on the high scores.
- Beside it: the level, the time, what was caught, the bosses beaten, the coins earned and
  what you have now; and what the game **brought home**: boss loot ("New" the first time),
  set pieces with how many of the set you have, the weapons and jewellery caught, and the
  crafting materials with your new totals. Under that: what was sold for coins, and what did
  not fit in your bags.
- "Play again" starts the same game again at once; "Back to the map" to pick another.

**The pause menu**
- Where the game is and how it stands (score, health, time, bags), one red Continue, and
  the rest grouped: your hunter (Character, Inventory, Loot & bonuses) and the game (How to
  play, Settings, and High scores, new here). Finishing the game and starting over sit
  apart, in a warning colour.

**How to play, Loot & bonuses, High scores and Settings: one window**
- The four are the tabs of one window, with the logo, the tab shown in blue, and Back and
  Close: no more rows of red "Go to" buttons. Inside, the boxes are the dark cards used
  everywhere else, and the loot screen's own tabs a joined bar.

**Your own sets**
- What your hunter wears can be saved under a name on the character sheet ("Your sets",
  under the three hunter sets) and put on again in one press. Up to four; each can be
  forgotten. They are kept on your account (a guest's in the browser). A saved set puts on
  what of it you own and, in a game, carry.

**Two-handed weapons**
- Hogger's Trophy Axe, Gath'Ilzogg's War Axe, Ashkandi and Crul'shorukh are held in both
  hands: while one is worn nothing can be held in the off hand, which the character sheet
  shows greyed. Putting something in the off hand takes the two-handed weapon off.
- To be worth it they give more: a boss's two-handed weapon 1.7 times what a one-handed one
  of its rarity and zone gives; Ashkandi now +17 attack power, Crul'shorukh +15 and 1% crit.

**The warriors wear armor**
- Hogger, Gath'Ilzogg, Chieftain Nek'rosh, Arnak Grimtotem, Khan Dez'hepah and Chief Ukorz
  Sandscalp wear armor, more the later they stand: arrows do 19% less to Hogger and 36% less
  to Ukorz. Arcane Shot goes through it. They say so when they appear.

**The share card and the icons**
- The card Discord and social posts show is the new medallion over the world map, and the
  browser tab and phone icons are the medallion with an I.

### For developers
- New: `game/styles/game-window.css` parts used in the menu's layer by `screens.css`,
  `game/ui/gameOverScreen.js`, `OutfitController` (`PUT /api/outfits`, migration
  `2026_10_14_130000`, `users.outfits`), `config('gear.two_handed')` and
  `two_handed_factor`, `warrior` on bosses with `gameConfig.bosses.armor`.

## 2.37.1 - 2026-10-14

### Changed
- A boss that charges (Hogger, Gath'Ilzogg, Chieftain Nek'rosh, King Bangalash, Echeyakee,
  Shadumbra, Big Samras) cannot be hurt by Arcane Shot from the moment it marks its lane
  until it is back at the top: it stood still on its lane while it lined up, which made it
  an easy target for the strongest shot. "Immune" shows where the shot lands. Ordinary
  arrows and Multishot still hit it.

## 2.37.0 - 2026-10-14

### What's new

**A new logo**
- The game has a new logo: a bronze compass medallion with the sea of the starting map in
  it, the name in ivory across it and an arrow under it. It is on the starting window, in
  the bar along the top of the site and on the log-in pages.

**The character sheet and the inventory look like the starting map**
- Both are now drawn like the starting map's window: dark stone with a thin gold trim, gold
  headings and the same buttons, with the new logo in their top row.
- On the character sheet the hunter stands in the painting of the place picked on the map
  (in a game, the place the game is in), with his slots down both sides of him. Beside him:
  what he has, as four figures, the three sets, and the slot that is picked, with "Put on"
  in red.
- The character sheet has an Inventory button, and the inventory a Character button, so
  either opens the other in its place.
- The inventory is as large as the character sheet. **Bags** shows the slots of your bags,
  the materials you have kept, and the bag vendor beside them; **Gear** shows what your
  hunter carries and what is in the bank side by side, with the hunter, how much he
  carries, and the button that sells every spare copy. Materials no longer have a tab of
  their own.
- On a phone both are the whole screen, as before.

## 2.36.0 - 2026-10-14

### What's new

**A hunter carries 36 pieces of gear**
- Everything you own is in the bank. Your hunter takes 36 pieces of it into a game, what he
  is wearing among them, and only those can be put on while playing: a full set is eight or
  nine, so three sets and a handful of boss items no longer all come along.
- The inventory's **Gear** tab now lists everything you own that can be worn, set pieces
  too, as "With your hunter" and "In the bank", with a count ("Carrying 31 of 36"). "Take"
  and "Leave" move a thing between the two; leaving something that is on takes it off.
- Between games anything you own can still be put on from the character sheet: it is taken
  along, if there is room. With no room the sheet says so, and things in the bank are
  marked. In a game the sheet shows only what was taken, and how much stayed behind.
- What you catch in a game can be worn in that game whatever you carry. Afterwards it is
  in the bank, unless it was put on and there was room for it.
- Until you choose, your hunter takes what he wears and then the rest of what you own, up
  to 36. Guests are not affected: they have no bank.

**Vile Priestess Hexx hexes the ground**
- The last Alliance boss was much easier than the last Horde boss, who stomps all of the
  ground but one patch while his Blizzard covers half the field. Hexx now does the same in
  her own way: every third attack she hexes the ground, which is marked violet with one
  green patch that is safe, and whoever is not on it when it goes off is hit as hard as by
  a stomp. Her bolts, her curse and her Rain of Fire are as they were.

### Fixed
- A boss fight started against the first zone's boss when the place was picked on the map
  first and "Boss fight" chosen after: choosing the kind of game put the place back on
  zone 1. The place picked now stays picked.

### For developers
- `users.carried` (migration `2026_10_14_120000`), `config('gear.carry')` and
  `gameConfig.bags.carry` (a test keeps them equal). `Gear::carried()` on the site and
  `carriedOf()` in `game/utils/gear.js` are the same rule. `PUT /api/equipment` takes and
  returns `carried`, and leaves out of what is worn anything not carried.
- The limit on changing gear during a game is the game's own: the site checks what is
  saved, not each change made while playing.
- A new boss behaviour `hexer` (`bolt`, `curse`, `hex`) in `game/data/bosses.js`; `hex` is
  a stomp in other colours (`GROUND_STRIKES` in `game/systems/bossSystem.js`).

## 2.35.0 - 2026-10-14

### What's new

**The hunter has stats: health, armor and attack power**
- Every piece you own of the set you are wearing now gives three things:
  - **Health**: more of it. The health bar shows the new most ("124/124").
  - **Armor**: every hit that lands does less. 50 armor takes a quarter off, 150 half, and
    it can never take more than 60%. Curses and other damage over time are not hits, and
    go through.
  - **Attack power**: each point adds 1% to what an arrow does.
- Each set is better than the one before:

  | A full set | Health | Armor | Attack power |
  |---|---|---|---|
  | Giantstalker (8) | +24 | 32, hits do 18% less | 16 |
  | Dragonstalker (8) | +32 | 48, 24% less | 32 |
  | Cryptstalker (9) | +45 | 72, 32% less | 54 |

- Attack power and armor have a row each in the hunter's panel.
- Changing sets keeps your health in proportion: three quarters full stays three quarters
  full, so swapping back and forth neither heals nor hurts.

**The sets' own bonuses are new**
- Giantstalker: +2% dodge at 3 pieces, +5% at 5, and at 8 **Multishot hits 40% harder**.
- Dragonstalker: +2% crit at 3 pieces, +5% at 5, and at 8 **Arcane Shot hits 50% harder**.
- Cryptstalker: as before, up to +20% damage to bosses from every arrow.

**The character sheet**
- A new window shows the hunter with a slot for everything he can wear, nineteen of them,
  and what it all gives him: health, armor, attack power, crit and dodge.
- Open it with the "Character" button on the starting window or in the pause menu, or with
  the C key (it can be changed in Settings). In a game the game is paused while it is open.
- Press a slot to see what you own that fits it, and press an item to put it on or take it
  off. "Put on a whole set" puts on every piece you own of that set in one press.
- Gear is now worn slot by slot, so sets can be mixed: each piece gives its own stats, and
  each set gives the bonus that the number of its pieces being worn reaches. The 1, 2 and 3
  keys and the buttons on the set panel put a whole set on, as before.
- What you wear is kept on your account and is what your next game starts in. It can be
  changed during a game too. A piece caught during a game goes on at once if its slot is
  empty or it belongs to the set you are wearing.
- A player who has never chosen starts in the pieces they own of the set they last wore, so
  nothing changes for them until they open the sheet.
- On a computer it is the painted frame with the hunter in the middle. On a phone, upright
  or sideways, it is laid out for a thumb: the numbers in a row, the three sets, the slots
  as a grid of squares, and under them the items for the slot you pressed.
- Slots that nothing in the game fills yet (neck, back, trinkets, weapons and the like) are
  shown empty, ready for boss loot.

**Bags, materials and the inventory**
- Everything caught in a game now goes into the hunter's bags. A slot holds up to 20 of one
  kind; a full stack starts another slot. Everyone has a backpack of 16 slots. The hunter's
  panel shows how many slots are taken.
- Once the bags are full, what does not fit is sold on the spot for 90% of its worth. A
  message says so the first time.
- **Crafting materials are kept, not sold.** Sixteen things that fall are materials: cloth,
  leather, herbs, bars, gems and reagents. A material that is carried pays no coins when the
  game ends: it goes onto the account, to be made into things later. Everything else is sold
  when the game ends, as before. So a game pays fewer coins than it did, and brings back
  materials instead.
- **Bags are bought with coins** and added to the backpack, up to four: 6 slots for 5 gold,
  8 for 15, 10 for 40, 12 for 100 and 14 for 250. With all four slots taken, a bigger bag
  replaces the smallest. The four biggest make 72 slots, room for every kind of thing in the
  game.
- **The inventory**, opened with the "Inventory" button on the starting window or in the
  pause menu, or the B key: the bags and the stacks in them, the materials kept on the
  account, and the way to the character sheet. Bags are bought there, between games.
- Pieces of the hunter sets are worn, not carried: they take no room in the bags.
- Guests have the backpack and no account to keep materials on.

**What the bosses drop can be worn, and sold**
- The item a boss drops is now gear: it has a slot on the character sheet (neck, back,
  trinket, a weapon hand and so on) and gives health, armor or attack power. A boss further
  along gives more. What you already won from bosses counts from the start.
- The weapons and jewellery that fall in a game (Ashkandi, Maladath, Ashjre'thul, Onslaught
  Girdle, Brutality Blade, the rings and the rest) are kept and can be worn too, no longer
  turned to coins.
- **Carrying**, a new stat: each point takes 1% off what is lost when a full bag forces a
  sale. The blue boss items and the purple trinkets have it, 1 to 3 points by how far along
  the boss is. The character sheet shows what full bags pay with the gear you have on.
- The inventory's **Gear** tab lists this gear with what it gives and what a vendor pays.
  Only one of a thing can be worn, so "Sell 2 spare" sells all but one, and "Sell every
  spare one" does that for the whole list. The last one can be sold too, after a warning
  that you will no longer be able to wear it; if it was on, it comes off.

**High scores say how they were made**
- The high score tables, in the game and on the site, have two new columns:
  - **Gear**: the strongest hunter set worn in that game and how many of its pieces
    ("Cryptstalker 9/9"), or "none". Pointing at it shows the health, armor and attack power
    it gave. It is the strongest worn at any point, so changing down before the end does not
    hide it.
  - **Version**: the version of the game the score was made in.
- In the game's table these replace "DS", which had shown nothing since the sets changed,
  and "Crit" and "Dodge". Scores from before this version show "none" for gear.

### Fixed
- A name written in decorative letters (the bold, script and similar alphabets some players
  use, such as 𝓓𝓐𝓒𝓞) showed as an empty space on devices with no font for them. A font
  that has them now comes with the game and the site, and is only fetched when a name on
  the screen needs it.
- The crit a set gives was never counted for arrows shot at a boss, only for catching items.
  It is now.
- The hunter's panel shows the crit and dodge a set gives, added to the number.

### For developers
- `game/utils/stats.js` has the formulas (`armorReduction`, `damageAfterArmor`,
  `arrowDamage`, `healthAtNewMax`), tested in `game/tests/stats.test.mjs`. An arrow on a
  boss does: base x (1 + attack power / 100) x the shot's worth x (1 + what the set adds to
  that shot) x (1 - the boss's armor) x weakened x (1 + the set's boss damage) x crit.
- The numbers are under `stats` and `sets` in `gameConfig.js`: `perPiece` for the stats and
  `bonuses` for the steps.
- The fallback font is Noto Sans Math (SIL Open Font License; the licence is beside it in
  `public/fonts`), declared as "Input Math" for U+1D400 to U+1D7FF only and put at the end of
  the game's and the site's font lists.
- New migration: `equipment` on `users`. `PUT /api/equipment` keeps what the sheet sets,
  leaving out anything not owned or in a slot it does not fit (`App\Support\Gear`).
- `game/utils/gear.js` has the rules of wearing things (slots, what fits where, what it all
  adds up to), tested in `game/tests/gear.test.mjs`; `game/ui/characterSheet.js` draws the
  sheet. An item says where it is worn with `slot`; to make something wearable, give it a
  slot and its stats.
- New migration: `bags` and `materials` on `users`, `materials` on `games`.
- `game/utils/bags.js` has the rules of the bags and `game/data/materials.js` the list of
  materials; the site has the same numbers and list under `bags` and `materials` in
  `config/loot.php`, with the bags' prices, and a test keeps them the same.
- The game says, when it ends, how much of each thing did not fit (`overflow`).
  `App\Support\Bags::settle()` works out the coins and the materials kept from that. It does
  not believe more was carried than the player's bags hold: then everything is paid as sold
  short and no material is kept.
- New migration: `gear` on `games`. The game hands it in when it ends; the site keeps the
  set, the number of pieces (never more than the set has) and what they gave.
- Bosses can have armor: an `armor` share (0 to 1) on a boss in `game/data/bosses.js` is
  taken off arrows, except an Arcane Shot's, which goes through it. No boss has any yet.

## 2.34.1 - 2026-10-13

### Changed
- **A boss fight is only for a boss already beaten.** In 2.34.0 the boss of any zone open to
  the player could be fought on its own, the next unbeaten one included, and anyone, guests
  too, could fight the first. That made it a way past the zones: beat a boss on its own, and
  the zone after it opened. Now the mode is offered only for a boss the player has beaten
  before in a game played through to it, on their account. For the others the choice is
  greyed out and says "beat this zone's boss in a game first". Guests are not offered it.

## 2.34.0 - 2026-10-13

### What's new

**Boss fight: one boss and nothing else**
- A new choice under "Mode" on the starting window: "Boss fight: only this zone's boss".
  Pick a zone on the map, choose it, and the fight begins at once: no zone to play through
  first, and the boss is in within half a second. When it falls the game is over, with
  "Boss defeated!".
- The fight starts with the quiver full, since there is no zone before it to gather arrows
  in: 200 arrows, or 400 with the large quiver.
- Anyone can fight the first boss of either side, guests too. A later boss is open on the
  same terms as starting in its zone: the bosses before it beaten, and the same price in
  coins.
- The boss pays its coins and drops its loot as always, so it is a way to go back for the
  item you are missing. Like Boss Rush, it is not played for the leaderboard.
- In the Discord channel a boss fight is posted when the boss went down: "Bob brought down
  Hogger in a boss fight."

**The three sets have buttons**
- The set panel now shows the three hunter sets as buttons under its heading, each with its
  key (1, 2 and 3, or whatever they were changed to), and the one being worn lit. Nothing on
  the screen said before that the set could be changed.
- On a phone or tablet the buttons are tapped to change set. On a computer the mouse is kept
  inside the field while playing, so there the keys do it and the buttons show which.

**Admins can unlock content for a player**
- An account's page in the admin section has a new part, "Unlock content":
  - **Zones**, for each side: open them up to any zone, or with the last boss beaten too.
    The bosses before are counted as beaten.
  - **Hunter sets**: give a whole set.
  - **The large quiver**: give it or take it away.
  - **Unlock everything**: every zone of both sides, all three sets and the quiver, at once.
- What is given is kept apart from what the player earned. Each part has "Take back", which
  removes only what was given: a boss the player beat and a piece they caught stay theirs.

**Bazil Thredd starts a riot**
- The third Alliance boss fought exactly like the fourth: both were assassins. Bazil now has
  a fight of his own. He throws knives singly and by the handful, and then calls on the mob:
  for a few seconds stones come flying in from both sides of the field, while he carries on
  attacking. The edges glow before they come. The stones can be shot down or stepped around,
  and the middle of the field is out of their reach.
- Vanishing is left to Edwin VanCleef.

### Changed
- **Arnak Grimtotem, Khan Dez'hepah and Chief Ukorz** stomp once in three attacks, where it
  was every second one, so the player is not kept in the safe patch for most of the fight.
  And when a row of projectiles is still falling as the stomp is wound up, the safe patch is
  put under the gap in the row: the two can be lived through by moving, without having to
  shoot a way out and running dry of arrows.
- **Five Horde bosses threw attacks about twice the usual size**, wide enough for a
  Multishot to clear every time. They are now in line with the others: Echeyakee's and
  Shadumbra's claws, Arnak's shockwave, Big Samras's swipe and Ukorz's Sand Cleave.

### For developers
- New migration: `granted_pieces` on `users` and `granted` on `boss_drops`. A zone is open to
  a player with loot from every boss before it, so opening zones gives them one item from
  each of those bosses, marked as granted (`App\Support\Grants`).
- `User::setPieces()` is now the pieces caught (`caughtPieces()`) together with those given.
- A boss's fighting style is a round of named attacks in `game/data/bosses.js`. `riot` is a
  new one (settings under `bosses.riot` in `gameConfig.js`), and `cutthroat` a new style
  that uses it.

## 2.33.3 - 2026-10-13

### Changed
- The game no longer writes its running commentary to the browser's console: 132 messages
  about canvas sizes, panels, settings, sounds and the like are gone, with the bits of code
  that existed only to produce them. Warnings and errors about things that have really gone
  wrong are still written.

### Fixed
- Two pickups had no sound, because the files the game asked for did not exist:
  - Power Word Shield and Frost Nova now play the guild's "follow up" clip. It was one of
    the idle remarks and has been taken out of those, so it belongs to the shield alone.
  - Time Cutter plays the new "na Marko" clip.

### For developers
- Removed an asset the game listed but never used and that did not exist
  (`assets/items/2.png`).

## 2.33.2 - 2026-10-13

### Changed
- The game's scripts and styles now come from the site's own build (Vite), like the rest of
  the site: one script and one stylesheet, each with a name made from its contents. A file
  that changes gets a new name, so a browser can never use an old copy after an update, and
  a file that did not change stays cached. It also loads faster: one script where there
  were 74.
- This replaces the version folder of 2.33.1, which is gone.

### For developers
- `vite.config.js` has two more inputs, `game/game-modular.js` and `game/styles/game.css`
  (which imports the game's stylesheets in the order `game/index.html` links them; a test
  keeps the two lists the same). `GameController` swaps the page's own script and stylesheet
  links for the built ones when it serves the built game.
- `npm run build:all` now builds the game first and the site second: the game's build writes
  `game/config/gameVersion.js` and `serverConfig.js`, which the site's build reads.
- Pictures, sounds and the page itself are still in `public/game`. The unbundled scripts
  there are no longer used by the site. A development server (`GAME_SERVE=source`) is
  unchanged: it serves the game's files as they are.

## 2.33.1 - 2026-10-13

### Fixed
- After an update, a browser could go on running the version before until the page was
  reloaded hard. The game's scripts load one another by plain file name, and the live
  server gave browsers no instruction about keeping them, so old copies stayed in use, and
  could even be mixed with new ones. Every version now loads its scripts and styles from
  addresses of its own, which no browser can have a copy of: a normal visit after an update
  gets the new version. Pictures and sounds keep their addresses and stay cached.

### For developers
- The build adds `public/game/v<version>`, a link to the folder itself. `GameController`
  writes the page's script and stylesheet addresses through it; the scripts' own imports are
  relative and so stay within it. Nothing needs changing in the web server.
- This takes effect from the next update on: a browser holding copies from 2.33.0 or before
  needs one last hard reload to reach this version.

## 2.33.0 - 2026-10-13

### What's new

**The interface fits the window**
- With a mouse and keyboard, the spell buttons no longer lie over the playing field. They
  stand beside it, a group against each edge (the shots on the left, or on the right for a
  left-handed player), in a row or a column as the room allows. A window with no room at the
  sides has the bar under the field, and a window the field fills exactly gives up a strip
  of the field's height for it.
- The spell buttons and the two panels are drawn smaller as the field gets smaller: a
  zoomed-in browser, developer tools open or a small window no longer leaves them covering
  the game. They never go below 60% of full size; when small, the buttons lose their names
  and show the key larger.

**Phones**
- A phone held sideways gets the wide field, filling the height of the screen, with the round
  spell buttons and the pause button in the empty margins beside it and the two panels small
  in the top corners. Before, it kept the upright phone's narrow field in the middle, with a
  panel stretched across it and the buttons on top of that.
- The starting window uses the whole screen on a phone. The game's stats box no longer
  shows above it before a game (it had nothing to show, and pushed "Start here" off the
  bottom), nor above Settings and the other screens opened from there.
- The name box on the starting window is as wide as the button under it.
- Held upright, the playing field runs to the bottom of the screen: the strip of about 100
  pixels that was kept empty under it is now part of the field.
- And it is as wide as the screen. It was a fixed 360 pixels, which left bars at the sides
  of a wider phone and was squeezed, with room wasted under it, on a narrower one. Now it is
  worked out from the width as it is from the height, and again when either changes. A wider
  phone shows the same field larger, not more of it, so the game plays the same on all.
- The stats box no longer cuts its text off on a phone ("Crit Chance: 1.."). There the
  labels are one word (Crit, Dodge, Saved, Area) and the numbers are always shown whole.
- The round spell buttons stand tight against the sides of the field.
- Settings, Controls: "Shooting buttons: on the left / on the right" says plainly what the
  Handedness setting did, which side the shots stand on, with the other buttons opposite.
  It works on a computer too, where the buttons stand beside the field.
- The pause button on phones shows the two bars of "pause" (it was a potion bottle) and
  stands in the top right corner of the field, away from the spell buttons. Held sideways it
  is under the set panel at the right edge.
- A touch that lands just beside a spell button or the pause button no longer sends the
  hunter running there: a band of 16 pixels around each is silent. A finger that comes down
  in it never steers, wherever it slides.
- Holding a button with one thumb no longer takes the steering away from the other: only
  fingers on the field itself steer.
- On a phone held upright a boss is drawn a little larger than the hunter, where it took up
  to 60% of the field's width: it has room to move about and is no longer hit by every shot. The
  hunter and pet are about a fifth smaller too, to step around what is thrown. Loot keeps
  its size.
- The cards of the effects in force (Speed Boost, Frost Nova and the like) stand above the
  buttons at the left edge of the field on a phone, narrower than before. They were in the
  strip the hunter moves in.
- Under the site's header the starting window no longer repeats the logo (on a computer
  too), and on a phone the footer under the game is gone: the browser's own bar lay over it.
  Its "Items" link is in the phone menu.

**Full screen on phones**
- On an Android phone or tablet, or an iPad, the game takes the whole screen when a game
  starts and when it is continued, and gives it back when the pause button is pressed and at
  game over. Under the site's header it is the game alone that fills the screen.
- The iPhone's browser does not let a web page do this. There, the site can be added to the
  home screen (Share, "Add to Home Screen"): opened from there it runs without the browser's
  bars, with the new icon.

### Changed
- A small window on a computer keeps the wide desktop field, scaled down. Before, it was
  taken for a tablet or a phone and given their narrower field and stacked panels. A laptop
  with a touch screen counts as a computer too. Phones and tablets are as they were.

### Fixed
- When the window changed size, the canvas was laid out to the field's old size and only
  caught up on the next change. The size is now worked out first.

### For developers
- `game/utils/hudLayout.js` decides the scale and the place of the buttons (tested in
  `game/tests/hudLayout.test.mjs`); `game/ui/hudLayout.js` puts it on the page as body
  classes (`hud-desktop`, `spells-sides`, `spells-below`, `spells-columns`, `hud-compact`)
  and CSS variables, read by "The interface follows the field" in `styles/spell-bar.css`.
  It runs each time the field is laid out (`setupHighDPICanvas`).
- The scale is applied with CSS `zoom`, so lengths inside the scaled elements are in scaled
  pixels: the script divides screen distances by the scale before handing them over.

## 2.32.0 - 2026-10-13

### What's new

**A music button on the starting window**
- "Music: On / Off" sits beside the Game menu. One press stops the background music, another
  brings it back. It is the same setting as "Play Background Music" in Settings, so the two
  agree, and the choice is remembered for next time.

## 2.31.0 - 2026-10-13

### What's new

**An admin section**
- At `/admin`, for accounts that have been made admins; "Admin" appears in their menu. To
  everyone else the pages do not exist.
- **Overview**: accounts (all, new this week, activated, with Discord, blocked), games
  (today, this week, all, by guests, being played now), scores, bosses brought down and the
  coins in all purses, with the latest games and newest accounts.
- **Accounts**: every account, searched by name, email or Discord name, or narrowed to not
  activated, with Discord, blocked or admins. An account's page shows what it has (games,
  best score, boss loot, set pieces, quiver, purse) and its latest games, and lets an admin:
  - activate it by hand, for a player the email never reached;
  - set its purse;
  - block or unblock it;
  - make it an admin or take that away;
  - delete it, after typing its email address.
- **Games**: every game played, newest first, searched by player name or narrowed to the
  leaderboard, guests, Boss Rush or games that ran without the server. A score can be taken
  off the leaderboard; the game stays on record.
- A blocked account cannot log in, by password or Discord, and is logged out wherever it is
  logged in. Its player can still play as a guest.
- An admin cannot block, demote or delete their own account from here.

**Announcements from the admin section**
- Admin, Announcements: write a message to the players (subject, message in Markdown, an
  optional button) and send it. "Send to me only" sends it to your own address first, and
  the form comes back as it was; "Send to everyone" asks before it goes.
- Everyone means players who confirmed their email address, kept news emails on and are not
  blocked; the page says how many that is. One address that fails does not stop the rest.
- What was sent is listed under the form: subject, text, to how many, when and by whom.

**Game settings without a new version**
- Admin, Settings: 28 numbers of the game that can be changed from the site.
  - Bosses: health and attack damage (for the first boss, and added per zone), the health
    given back for a kill, the damage of an arrow.
  - The hunter: health lost for a missed item, quiver slots filled at the start, how often
    the pet fetches.
  - How often each rarity of item falls, and the copper each pays.
  - Boss loot and prices: the large quiver's chance, the price of skipping a zone and of a
    Boss Rush, the copper a boss pays.
  - The leaderboard's length.
- Each shows the game's own value beside it and is marked when it differs. Every value has a
  range it must stay within. One button puts everything back.
- A change counts for games started after it is saved. A game already running keeps what it
  started with until the page is reloaded.

**Google Analytics**
- Visits to the site and the game are counted by Google Analytics where its id is set
  (`GOOGLE_ANALYTICS_ID` in `.env`). A visit to the landing page counts once, not again for
  the game framed inside it, and the admin pages are not counted.

### For developers
- The first admin is made on the server: `php artisan input:admin someone@example.com`
  (`--remove` takes it away). After that, admins can make others from the account's page.
- New migration: `is_admin` and `blocked_at` on `users`.
- New migration: the `announcements` and `settings` tables.
- The settings an admin can change are listed in `config/game_settings.php`: each names the
  server value it replaces (`config`), its place in the game's `gameConfig` (`game`), or
  both, with its range. Changed values are rows of `settings`, laid over the config when the
  application starts (`App\Support\GameSettings`) and handed to the game with its page
  (`INPUT_BOOT.settings`, applied at the end of `game/config/gameConfig.js`).
- The values in the files stay the defaults: changing a number in the admin section does not
  touch them, and the tests that compare the game's files with the server's still hold.

## 2.30.0 - 2026-10-13

### What's new

**A proper card when the site is shared**
- Posting the site's address in Discord, a chat or on social media now shows a card: the
  gold logo over the world map, the name, and a line about the game. Every page and the game
  itself carry it.

### Changed
- In the channel posts, a player who has connected Discord is called by their Discord name;
  everyone else by their player name as before.
- The link at the end of a channel post no longer unfolds into the site's card under every
  post.

### For developers
- The card is `resources/views/layouts/social.blade.php` (Open Graph and Twitter tags), with
  the picture at `public/images/input-card.jpg` (1200x630).

## 2.29.0 - 2026-10-13

### What's new

**Games are posted to the guild's Discord channel**
- When a game ends, one line goes to the channel: who played, their score, level and side,
  the last boss they brought down, and their place if it made the top ten ("That is the new
  top score."). Beating the tenth boss and Boss Rush runs get their own wording.
- Only games that count are posted: played to the end, with a score above zero. Games left
  mid-way and games that ran without the server are not.
- A player's name cannot ping anyone or add links or formatting in the channel.
- The post is sent after the player has their result, so the game never waits for Discord,
  and Discord being unreachable changes nothing in the game.

### For developers
- `DISCORD_WEBHOOK_URL` in `.env`: a webhook of the channel (Channel settings, Integrations,
  Webhooks). Empty means nothing is posted. The address is a secret: anyone who has it can
  post to the channel.

## 2.28.0 - 2026-10-13

### What's new

**Discord: log in and activate with it**
- "Log in with Discord" on the log in page and "Register with Discord" on the register page.
  The first time, an account is made from the Discord name and email address, already
  activated: Discord has checked the address, so no activation email is needed.
- An account that is not activated yet can be activated by connecting Discord instead of
  following the emailed link: "Activate with Discord" on the activation page, or "Connect
  Discord" on the profile. The emailed link still works as before.
- A Discord account whose verified email address matches an existing account logs into that
  account. A Discord account can be connected to one account only.
- An account made through Discord has no password the player knows. "Forgot your password?"
  sets one, which is needed to change the password or delete the account from the profile.

### For developers
- Needs a Discord application: `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` in `.env`,
  and `<APP_URL>/auth/discord/callback` added as a redirect under OAuth2 in the Discord
  developer portal. Until both are set, no Discord button is shown and the routes answer 404.
- New migration: `discord_id` and `discord_name` on `users`.
- `User::canUseRewards()` is now a verified email or a connected Discord account.
- If an account with an unverified email is taken over by a Discord login with that same
  address, its old password stops working: whoever registered it had not proved the address.

## 2.27.0 - 2026-10-13

### What's new

**Choose your own keys**
- Settings, Controls now lists every key the game uses: the five spells (Autoshot,
  Multishot, Arcane Shot, Dragon Cry, Zandalari), wearing each of the three sets, and
  opening Settings. Click a key, then press the one you want there. Esc leaves it as it is.
- Give an action a key that another one has and the two change places, so no key ever does
  two things. "Usual keys" puts them all back, and so does "Reset to Defaults".
- The choice is kept in the browser. The keys on the spell buttons, in How to Play and in
  the game's messages ("Break it with Arcane Shot (T)") follow it.
- Esc stays the pause key: the browser itself uses it to let the mouse go.

**A logo and a new icon**
- The gold "INPUT" wordmark replaces the plain text title on the game's starting window, in
  the site's header and on the log in and register pages.
- The browser tab, bookmarks and a phone's home screen show the new gold "I" icon, on the
  game and on every page of the site.

**A film on the About page**
- The About page opens with the guild's short film (16 seconds, with sound). It plays when
  you press play, never on its own.

### Fixed
- The keys work whatever the keyboard is set to type. The game now goes by where a key is
  on the keyboard, not by the letter it types, so on a Cyrillic layout the key in E's place
  still shoots. Before, the spell keys did nothing unless the keyboard was set to Latin.

### For developers
- The actions, their usual keys and the player's changes are `game/utils/keybindings.js`
  (keys are the browser's `event.code`); the Settings section is
  `game/ui/keyBindingsScreen.js`. Anything in the page marked `data-key-of="<action>"` has
  its text kept as that action's key.

## 2.26.1 - 2026-10-13

### Fixed
- The starting window now shows a logged-in player's purse, at the top beside the Game
  menu. Under the site's header it was not shown anywhere on that window, though the map's
  prices are in coins. It follows what a game earned and what a skip or Boss Rush cost.

## 2.26.0 - 2026-10-13

### What's new

**The world map is the starting window**
- The game now opens on the world map. Pick a pin and press "Start here": the place you
  pick is the side you play and the zone you start in. The old starting window, with its
  Alliance and Horde buttons and its "Start in" list, is gone; the map does both.
- Beside the map is the place picked (its picture, the boss that guards it, what it costs
  or why it is closed), your name or the way to log in, and for logged-in players the
  choice of Boss Rush. The side you played last is picked when the window opens.
- How to Play, Loot & Bonuses, High Scores and Settings are under one "Game" menu at the
  top right of the window.
- On phones the place picked and the start button come first, with the map under them; the
  map scrolls sideways and moves to the place picked.

### Changed
- The pet's bite has sounds of its own: a short snap of jaws on most bites, and a voiced
  clip on every third.
- A new voice clip, "Zlatko Zgnan", is said when the hunter reaches a new level.
- The "no need" voice clip is gone: it had other voices in it. A big heal no longer draws a
  remark.

### For developers
- The starting window is `#nameEntryContent` in `game/index.html`, drawn by
  `game/ui/travelMap.js` (`showTravelMap`) and wired in `showStartMap` in
  `game/game-modular.js`. The side's radio buttons and the starting-zone list are still in
  the page, out of sight: the map sets them, and the rest of the code reads them as before.

## 2.25.0 - 2026-10-12

### What's new

**The hunter's pet**
- Every hunter has a pet: a nightsaber cat for the Alliance, a prairie wolf for the Horde.
  It stays at his side when there is nothing to do and trots along when he moves.
- Every 20 seconds it runs to fetch one falling item the hunter is not going to reach, and
  comes back. A fetched item counts exactly as if he had caught it: points, coins, set
  pieces and all. "Fetched!" shows over the pet.
- In between it goes for the things that would hurt the hunter: it runs under a falling
  fireball, bolt or boss attack, leaps and bites it out of the air ("Chomp!"). After each
  fetch or bite it rests two and a half seconds at his side. It does this in boss fights
  and in Boss Rush too.

**The world map**
- The main menu has a "Choose on the world map" button. It opens a painted map of Kalimdor
  and the Eastern Kingdoms with a pin for every zone of both sides, twenty in all, and one
  for Blackrock Depths, which is not in the game yet.
- Select a pin to see the zone: its picture, the boss that guards it, and whether you may
  start there. The first zone of each side is open to everyone; a later one follows the
  rules for skipping ahead (the earlier bosses beaten, an activated account, the coins), and
  a pin you cannot start at says why.
- "Start here" starts the game in that zone at once, on that zone's side, and takes any
  coins it costs.

**Guild voice lines**
- Fourteen clips of the guild's own voices are said at moments in the game: when a boss
  comes in and when it goes down, when Thunder Fury or another rare item is caught, when
  health falls below a quarter, on a heavy blow or a big heal, when the game is lost or won,
  and now and then for no reason at all.
- One line at a time, with at least six seconds of quiet after each. They follow the sound
  effects volume, and "Guild voice lines" under Settings, Audio turns them off on their own.

**The site**
- A new About page says who I N P U T is: a World of Warcraft guild that plays Classic
  content, and a game made on its Discord for guildies to joke about.
- "My Games" and "Items" have moved from the top menu into the menu under the player's
  name. The top menu is now Play, High Scores and About. The foot of every page links to
  About and Items, so guests can still reach the item list.

### Changed
- Defeating a boss gives back 10 health, down from 30. You no longer walk out of a fight
  close to full health; what the fight cost is carried into the next zone.

### Fixed
- Dropped frames during play. Two causes, both grown worse as items were added: the glow
  behind falling items was being thrown away and redrawn all through a game, a few times a
  second, and every picture was measured the first time it appeared, in the middle of the
  game. Glows are now kept, and pictures are measured ahead while the game loads.

### For developers
- The pets are `game/data/pets.js` (two pictures each in `game/assets/pets/`), the
  behaviour `game/classes/Pet.js`, and how often, how fast and how big `pet` in
  `game/config/gameConfig.js`. A later pet is a pair of pictures and an entry in the data.
- The art as delivered is `game-art/hunter-companion-pets.zip`, not in the repository.
- Which clip is said at which moment is `game/data/voiceLines.js`: a first assignment made
  from the clips' labels, to be corrected by ear. The clips are in
  `game/assets/audio/voice/` (OGG, and WAV for browsers without OGG), played by
  `game/systems/voiceSystem.js`; how often is `voice` in `game/config/gameConfig.js`, where
  `explicit: false` leaves out the one clip with swearing. Cut from
  `game-art/game-voice-clips.zip`, not in the repository.
- The world map is `game/ui/travelMap.js`, with the pins in `game/data/worldMap.js` and the
  picture `game/assets/ui/world-map.webp`. It was built from `game-art/travel-map-pack.zip`:
  the map, the pin positions and the descriptions are the pack's, the selector is the game's
  own (the pack's script and its copies of the backgrounds are not used).

## 2.24.0 - 2026-10-12

### What's new

**Accounts are activated by email**
- Registering sends an email with a link that activates the account. The player is logged
  in and can play at once, and everything they earn is kept: coins, boss loot, set pieces,
  the large quiver.
- Until the account is activated, what was earned cannot be used: no spending coins on
  skipping ahead or Boss Rush, no bonus from wearing a set, no large quiver. The main menu
  and "My Games" say so and offer to send the email again.
- Following the link activates the account and sends a second email saying what is now
  open. Changing the email address in the profile asks for the new one to be confirmed.

**The emails**
- Four emails in the game's own look, dark with gold headings: account activation,
  password reset, the welcome after activating, and a general news email for new versions
  and events.
- News goes only to players with an activated account. Every news email has a link that
  stops them, and the profile has a checkbox for it.

### For developers
- Deploying this version needs `php artisan migrate` (new `news_emails` column on `users`).
  `MAIL_FROM_ADDRESS` in `.env` must be an address the mail service may send from.
- Accounts registered before this version are not activated: their owners have to ask for
  the activation email (main menu, "My Games" or the profile) before they can spend again.
- The emails are `app/Notifications/` with their texts in `resources/views/emails/`; the
  look is `resources/views/vendor/mail/html/` (the theme is `themes/default.css`). What an
  account may do before activation is `User::canUseRewards()`.
- Send news with `php artisan input:announce "Subject" --file=message.md` (Markdown;
  `--button` and `--url` add a button, `--to=address` sends to one account to try it out).
- With `APP_ENV=local`, `/mail-preview` shows each email in the browser.

## 2.23.0 - 2026-10-12

### What's new

**Hunter sets are collected over many games**
- The three armour sets, Giantstalker, Dragonstalker and Cryptstalker, are no longer
  something to finish inside one game. Every piece a logged-in player catches is theirs for
  good and stays on their account. A guest has what the game in hand gave them.
- Each set drops in its own stretch of the game: Giantstalker from level 3, Dragonstalker
  from level 9, Cryptstalker from level 15. Pieces can drop again and again, so a missed one
  comes back in another game.
- You wear one set at a time and can change it whenever you like, in a boss fight too:
  press 1, 2 or 3, or tap the set panel while paused. The panel shows the set you wear, the
  pieces you own and what it gives.
- A set gives more the more of it you own:
  - Giantstalker: +2%, +4%, +6% dodge at 3, 5 and 8 pieces.
  - Dragonstalker: +2%, +4%, +6% crit at 3, 5 and 8 pieces.
  - Cryptstalker: +5%, +10%, +15%, +20% damage to bosses at 2, 4, 6 and 8 pieces.
- "My Games" and the All Time tab's data list the three sets with the pieces you own.

**The goal of the game is the last boss**
- Defeating the tenth boss of your side wins the game: it ends a few seconds later with
  "Victory!" and is recorded like any game.

### Changed
- Collecting ten Dragonstalker pieces in one game is no longer the goal, and completing the
  set in a game no longer slows the game or adds crit. The Dragonstalker panel is now the
  panel of the set you wear.
- A missed set piece is a miss like any other: it costs a little health and can drop again.
  It used to be gone for the rest of the game.
- Ashjre'thul and Ashkandi, once two of the ten Dragonstalker pieces, are epic items of
  their own.

### For developers
- The sets are `sets` in `game/config/gameConfig.js` (levels and bonuses) and in
  `config/loot.php` (pieces, levels and how long the server holds each set back); the rules
  are `game/utils/sets.js`. The `tier_set` rarity is gone: all 25 pieces are `set_piece`.
- A player's pieces are the set pieces among their picked-up drops (`User::setPieces()`);
  the game gets them as `INPUT_BOOT.user.pieces`. No migration is needed.
- Left in place but no longer reached: `checkDragonstalkerCompletion` in
  `game/utils/gameUtils.js` and the Flask of Titans code in `game/systems/spellSystem.js`.

## 2.22.0 - 2026-10-12

### What's new

- Two more hunter sets to collect, 17 pieces in all: **Giantstalker Armor** (tier 1, eight
  pieces) and **Cryptstalker Armor** (tier 3, eight pieces and the Ring of the Cryptstalker).
  They fall as rare items from level 6, decided by the server like the other rare ones, pay
  2 silver each and count towards the collection, which now has 40 rare items. Collecting a
  set does nothing yet beyond the collection.
- The eight Dragonstalker pieces have new pictures in the same painted style. They work as
  before: collecting the ten pieces of the Dragonstalker panel is still the game's goal.

### For developers
- The new pieces are their own rarity, `set_piece`, so that the Dragonstalker rules tied to
  `tier_set` (the panel, the goal, the penalty for a missed piece) do not apply to them. Each
  piece names its set in `set` (`giantstalker`, `cryptstalker`; the Dragonstalker pieces have
  `dragonstalker`). Weight, coins, unlock level and size are under `set_piece` in
  `game/config/gameConfig.js` and `config/loot.php`.
- The art as delivered is `game-art/hunter-tier-sets.zip`, not in the repository.

## 2.21.0 - 2026-10-12

### What's new

- **Finish Game.** The pause menu has a "Finish Game" button: it ends the game there and
  then, after asking once, and records it with the score you have, like a game that ran to
  its end.
- **Debuffs by the health bar.** When a boss's curse or a shadowbolt's burn is eating at
  your health, it is named right under the hunter's health bar with what it takes each
  second and how long it has left ("Curse -2/s (4s)"), so damage with nothing hitting you
  is no longer a mystery.

### Changed
- Frost Nova now freezes only what would hurt you: fireballs, bolts and the bosses' attacks
  hang where they are, while items, power-ups and the helpful spells keep falling. It used
  to freeze everything.

## 2.20.0 - 2026-10-12

### What's new

**The quiver**
- The hunter's arrows now go in a quiver of 4 slots of 50 arrows: 200 at most. A game starts
  with 2 slots filled, so with 100 arrows where it used to be 20. Arrows caught with a full
  quiver are lost. The stats panel shows how full it is ("95/200").
- Logged-in players can find the large quiver, Ancient Sinew Wrapped Lamina: every boss
  defeated has a 10% chance to drop it, besides the boss's own item. It is found once and
  kept on the account, and adds 4 more slots: 400 arrows. "My Games", the All Time tab and
  the Items page say whether you have it.

**Boss Rush**
- A new way to play for logged-in players: nothing but the ten bosses of your side, back to
  back, with no items and no stray projectiles. Choose it under "Mode" on the main menu. A
  run costs 50 silver, taken when it starts.
- Between two bosses there is a short breather, and arrows and a health potion drop to
  restock. Beat all ten and the run is complete.
- The bosses pay and drop loot as they always do (a full run pays 55 silver), so it is the
  quickest way to hunt for boss loot and the large quiver. Boss Rush games stay off the
  leaderboard.

**Storms for the last bosses**
- Vile Priestess Hexx calls down Rain of Fire, and Chief Ukorz Sandscalp a Blizzard. Below
  half health the boss marks the half of the field you stand in; a moment later the storm
  comes down there for four seconds and hurts whoever is still in it. Cross to the other
  half. It comes again every ten seconds, beside the boss's own attacks.

### Changed

- Hogger and Chieftain Nek'rosh now charge: between their throws they mark a lane and rush
  down it at you.
- Waiting for a boss to weaken now has its price. The weaker a boss gets, the more
  frantically it fights: fully weakened, the first boss attacks 1.6 times as often as at the
  start of the fight, the fifth 2.2 times, the last 3 times. Its attacks are still wound up
  as before, so each one can be seen coming.
- Every boss now sends down a row with one gap every few seconds, on top of its own attacks.
  This too comes faster as the boss weakens.

### For developers
- Deploying this version needs `php artisan migrate` (new `quiver` columns on `users` and
  `boss_drops`, new `mode` on `games`).
- Boss Rush: the fee is `rush` in `config/boss_loot.php`, the breather and what drops in it
  `bossRush` in `game/config/gameConfig.js`. The game sends `mode: boss_rush` when it opens
  the game; the run itself is `updateBossRush` in `game/game-modular.js`.
- A boss's storm is `storm` on its entry in `game/data/bosses.js`; timings and damage are
  `storm` under `bosses` in `game/config/gameConfig.js`. Hogger and Nek'rosh use the new
  `brawler` behaviour.
- The quiver's sizes are `quiver` in `game/config/gameConfig.js`; the drop's name and chance
  are `quiver` in `config/boss_loot.php`.
- Both are under `bosses` in `game/config/gameConfig.js`: `frenzy` for the quickening, and
  `volleyEvery`, which was there but unused, for the rows.

## 2.19.0 - 2026-10-12

### What's new

- Twelve new items to catch, crafting materials and reagents from Classic:
  - **Common:** Light Feather, Rugged Leather, Kingsblood, Fadeleaf, Runecloth.
  - **Uncommon:** Mithril Bar, Thorium Bar, Essence of Water, Dark Rune, Righteous Orb.
  - **Epic:** Fiery Core and Lava Core. Like the other epics they are decided by the
    server and count towards the collection, which now has 23 rare items.
- A new "Items" page on the site (in the menu next to High Scores, open to everyone) lists
  every item in the game by rarity with its picture and what catching it pays in coins, and
  every boss with what defeating it pays and the three items it can drop.
- Each rarity still comes up as often as before: there are more items to a rarity, so each
  single item is a little rarer. Dragonstalker pieces and the other rare items drop exactly
  as often as they did.

### Changed
- Bosses attack more often: the pause between attacks is a quarter shorter for the first
  bosses and over a third shorter for the last.
- Standing right under a boss is no longer safe. Stay within its reach for three quarters of a second and
  it winds up a swipe, shown as a red patch under it, that does twice its usual damage; step
  back out and you are clear. Rushing in with Dragon Cry to Multishot from close up still
  pays, but only in bursts between swipes.

### Fixed
- The game stuttered now and then, and after a stutter the hunter was somewhere else. The
  cause was the animated hunter himself: every frame his picture was drawn far bigger than
  he is on screen and shrunk on the way, which cost more than everything else in the frame
  together. He is now drawn at the size he is shown at. In our test this one step takes a
  sixth of the time it did.
- With the mouse held inside the game, the game reads the mouse's own movement, without the
  system's pointer acceleration, and leaves out the odd impossible jump a browser reports.

### For developers
- The swipe is `melee` under `bosses` in `game/config/gameConfig.js`.
- The Items page is `/items` (`ItemController`, `resources/views/items.blade.php`), built
  from the catalogue and the coin values in `config/loot.php` and from `config/boss_loot.php`.
- The site's catalogue (`catalog` in `config/loot.php`) now lists every item in the game
  with its name and picture, not only the rare ones. `LootTable::catalog()` returns them
  all with their rarity; `LootTable::rareCatalog()` is the part a collection is made of.
- An item's weight is per item, so the weights went down as the lists grew (regular 0.4 to
  0.3, green 0.2 to 0.11, epic 0.1 to 0.07) to keep each rarity's share. They are in
  `game/config/gameConfig.js` and `config/loot.php`, which must agree.
- The art as delivered is `game-art/classic-loot-expansion.zip`, not in the repository.

## 2.18.0 - 2026-10-12

### What's new

- The "Item Bonuses" page of the pause menu is now "Loot and Bonuses", and opens on what
  this game has collected so far:
  - **This Game**: the coins earned, what the bosses dropped, and every item caught with
    how many of each. Items that give a bonus say which.
  - **Permanent Bonuses** and **Temporary Bonuses**: as before.
  - **All Time**: for logged-in players, everything the account has collected over all its
    games: the purse, all 60 pieces of boss loot and the rare items, with how often each
    was found. What is still missing is greyed out. This replaces the "All Items" tab.
- Boss loot is also listed at the top of the panel's list of what the game has collected.
- Guests are offered an account first: the main menu has "Log in" and "Register" buttons
  above the name box, which is now for playing as a guest. This replaces the small links
  under the name box.

### For developers
- The page is drawn by `game/ui/lootScreen.js`. The account's collection comes from
  `GET /api/collection` (logged-in players only), the same data as "My Games".

## 2.17.0 - 2026-10-12

### What's new

- The old item pictures are redrawn in the same painted style as the bosses and backgrounds:
  26 items (rings, capes, gems, food, coins, trinkets), the potions and other power-ups, the
  three falling spells (Sprint, Power Word: Shield, Frost Nova) and the Dragon Cry,
  Zandalari, Autoshot and Multishot buttons. They no longer sit in dark square tiles.
- Bronze, Silver and Thorium Arrows each have their own picture; they used to share one.
- The four coins now look like the metal they are named after.

**Boss loot**
- Every boss you defeat drops one of its three items: usually the common one (70%),
  sometimes the rare one (24%), now and then the epic one (6%). The name comes up on screen
  in its rarity's colour.
- Logged-in players keep what drops. "My Games" lists every boss with its three items, the
  ones you have and how many times you found them. Guests are shown the item, but it is not
  kept.

**Coins**
- Catching items earns coins: 10 copper for a common item, up to 10 silver for Zee Zgnan
  Tigar. A boss pays 1 silver for each zone it guards. 100 copper is a silver, 100 silver a
  gold.
- The stats panel shows what the game has earned so far, and the game over screen what it
  came to. For logged-in players it is added to their purse, shown on the main menu and on
  "My Games". There is nothing to spend it on yet.
- Coins and boss loot are kept whichever way a game ends, also when it was left early or
  went offline.

**Skipping ahead**
- Coins have a use: a logged-in player can start a game in a later zone. The main menu shows
  "Start in" once you have beaten the first boss of a side. You can start in any zone whose
  earlier bosses you have defeated before, for 50 silver per zone skipped (the third zone:
  1 gold). The coins are taken when the game starts.
- A game that skipped ahead starts with no points and counts on the leaderboard like any
  other. Rare items that are already unlocked at its starting level can drop from the start.

**Mouse**
- While you play, the mouse is kept inside the game, so it can no longer slip off the field
  or out of the window and leave the hunter standing. Esc lets it go and pauses the game;
  carrying on takes it again. It can be turned off under Settings, Controls.

### Changed
- The first bosses have less health and hit harder. The first boss has a fifth less health
  and Hogger a tenth less, and their attacks take 8 and about 9 health instead of 6 and 7.
  The difference fades with every zone: the last bosses are as they were.
- Gath'Ilzogg was too easy for the fifth boss. He now fights as a warlord: a fan of axes, a
  rush down the field, a throw and a row, one after the other.

### Fixed
- The old background picture no longer flashes up when the game opens. The page starts
  plain dark, and the picture of the side you chose last time is fetched first, before the
  rest of the game. The old picture (`game/assets/ui/background.jpg`) is removed.

### For developers
- Deploying this version needs `php artisan migrate` (new table `boss_drops`, new `coins`
  columns on `users` and `games`, new `start_zone` on `games`).
- Skipping ahead: the price and the length of a zone are in `config/boss_loot.php`; the game
  sends `startZone` when it opens a game and the server checks the bosses beaten and takes
  the coins (`games.start_zone`). The menu's choice is `game/ui/startZone.js`.
- The mouse lock is in `game/systems/inputSystem.js` (the browser's pointer lock).
- What bosses drop is `config/boss_loot.php`; the game reports a defeated boss with
  `POST /api/games/{token}/bosses` and the server rolls the item. Coin values are `coins` in
  `config/loot.php` and in `game/config/gameConfig.js`, which must agree
  (`tests/Feature/BossLootConfigTest.php`). The server works out a game's coins when it is
  handed in (`app/Support/Coins.php`).
- The new pictures are WebP, named after the item (`game/assets/items/hard-cheese.webp`),
  and the falling spells are in `game/assets/projectiles/`. The 38 pictures they replace are
  removed. `game/data/assetRegistry.js` keeps its keys; `config/loot.php` has the new paths.
- The originals as delivered (1024px PNG) are in `game-art/item-redraw-pack.zip`, which is
  not in the repository.

## 2.16.1 - 2026-10-12

### Fixed
- More room to play in a boss fight. When the screen has a band above the play field, the
  messages ("Bronze Arrows! +25 arrows" and the like) are shown there instead of on the
  field, and the boss and his health bar start right at the top of the field. Where the
  field fills the screen, the messages stay on it as before.

## 2.16.0 - 2026-10-12

### What's new

**Bosses fight back, and each in their own way**
- A boss no longer hangs over your head. He sweeps along the top of the field, passing over
  you, so standing still and shooting straight up mostly misses.
- Bosses sidestep arrows they see coming: the first ones slowly and now and then, the last
  ones quickly and often.
- Every attack is wound up first. The boss glows and stands still, and cannot sidestep: that
  is the moment to shoot.
- Six ways of fighting, shared out among the twenty bosses:
  - **Throwers** (Garrick Padfoot, Hogger, Gath'Ilzogg, Stitches, Nek'rosh) throw at you, and
    now and then a whole row with one gap.
  - **Assassins** (Bazil Thredd, Edwin VanCleef) throw fans of blades and vanish, to come
    back on your other side.
  - **Chargers** (King Bangalash, Echeyakee, Shadumbra, Big Samras) mark a lane and rush down
    it into your part of the field. Get out of the lane.
  - **Casters** (Vile Priestess Hexx, Sarkoth, Zalazane, Taragaman) send bolts that follow
    you, and a curse that eats at your health until it runs out or Dragon Cry lifts it.
  - **Bombers** (Fozruk, Gerenzo Wrenchwhistle) lob things that land where you stood and
    burst a moment later.
  - **Pounders** (Arnak Grimtotem, Khan Dez'hepah, Chief Ukorz Sandscalp) stomp: the whole
    floor hurts except one safe patch, shown in green.

**Dodging, the Warcraft way**
- Your dodge chance now follows Classic's rule: every level an attacker is above you takes
  0.2% off it. A boss counts as three levels above you, so his attacks are 0.6% harder to
  dodge. Charges, blasts and stomps can be dodged, and are blocked by a shield, like
  anything else. A curse cannot.

### For developers
- A boss's way of fighting is its `behaviour` in `game/data/bosses.js`; `behaviours` there
  lists the round of attacks each one works through. The attacks are in
  `game/systems/bossSystem.js`; movement, sidestepping and wind-up settings are under
  `bosses` in `game/config/gameConfig.js`.
- The dodge rule is `game/utils/combat.js`.

## 2.15.0 - 2026-10-12

### What's new

- Horde players have their own figure: a tauren, animated the same way as the Alliance's
  pajama hunter. He breathes, leans and steps, reaches to catch, recoils from a hit and
  braces to shoot. The figure changes with the side chosen on the main menu.

### For developers
- The animator is now `game/classes/CharacterAnimator.js` and takes a "rig" that says where
  the arms, legs, chest, feet and back-gear are in a drawing. The two figures and their rigs
  are in `game/data/playerCharacters.js`; a new figure is a picture plus an entry there.

## 2.14.0 - 2026-10-12

### What's new

- The hunter has a small health bar under his feet: green, then amber, then red as his
  health drops.

## 2.13.0 - 2026-10-12

### What's new

**The pajama hunter**
- The player is now a full figure: the hunter in his pyjamas, in place of the floating face.
- He moves: he breathes while standing, leans and steps when he walks, lifts his hands when
  he catches something, draws back and flashes when he is hit, and braces when he shoots.
- What catches loot and what gets hit is his head, arms and body: the same size as the old
  player, so catching and dodging feel as they did. His legs neither catch nor get hit.
- Players who ask their device for reduced motion get him standing still.

### For developers
- `game/classes/HunterAnimator.js` (renamed `CharacterAnimator.js` in 2.15.0) warps the one picture (`game/assets/player/pajama-hunter.webp`)
  over a grid with WebGL and stamps the result onto the game's canvas; without WebGL the
  picture moves as one piece. `Player` tells it what happened (`onCollect`, `onHit`, `onShoot`).
- The pictures the player used to be drawn with are no longer loaded.

## 2.12.0 - 2026-10-12

### What's new

**Controls**
- A new Handedness setting says which hand moves the character and which one shoots.
  Right-handed (the default) puts the shots on the left; left-handed puts them on the right.
- On phones the spell buttons are no longer one bar across the bottom. The shots (Autoshot,
  Multishot, Arcane Shot) are a column of round buttons at one edge and the other spells a
  column at the other, both just above the strip the character moves in, so no button is in
  the way of the moving thumb. With a keyboard the bar stays in one piece, shots first.
- The pause button on phones sits above the buttons at the right edge.

**Look**
- The frame around the play field, and the line marking where the character can move, are
  drawn in the interface's gold in place of the neon green.
- The "supported by" credit is no longer shown inside the game; it is in the site's footer.

**Phones**
- On the landing page the site's header and footer disappear while a game is underway, so
  the game has the whole screen. They return at the main menu and at game over.

## 2.11.0 - 2026-10-12

### What's new

**Every zone has its boss**
- Each of the ten zones on each side now ends with its own boss, who never leaves his zone:
  Hogger is met in Elwynn Forest, and Stormwind cannot be reached while he stands. When you
  have the experience for the next zone the boss comes in, and the level stays put until he
  is defeated.
- A boss throws only his own attack: Hogger his axe, Sarkoth his venom, and so on.
- Bosses get harder zone by zone: more health, harder and faster attacks, less time. The
  first two are meant to be easy.
- From the second zone on, a boss shields himself during the fight. Ordinary arrows are
  absorbed until the shield is broken with an Arcane Shot.
- Every fight has a time limit. When it runs out the boss enrages: he throws faster and hits
  harder, more so every second.
- A boss still weakens the longer the fight lasts, but now only up to double damage.

**Arcane Shot (T)**
- Takes the place of Flask of Titans on the spell bar. It fires one arcane arrow that breaks
  a boss's shield, flies straight through projectiles, and hits for three arrows' worth. It
  uses 5 arrows.
- Flask of Titans is no longer on the bar. It is kept in the game's files for later.

**New hazards and new pictures**
- The attacks of all 20 bosses, of both sides, also fall as hazards all through the game:
  daggers, axes, boulders, venom, claw slashes and the rest, any of them at any point,
  whether or not you have met the boss they belong to.
- Two new projectiles: Smite from level 7 and Holy Shock from level 11.
- Fireball, Frostbolt and Shadowbolt have new pictures.

### For developers
- `game/data/bosses.js` lists all 20 bosses by side and zone; their strength comes from the
  zone and the `bosses` settings in `game/config/gameConfig.js`.
- Archived spells are `archivedSpells` in `game/data/playerSpells.js`.
- Rare items the server schedules during a fight now drop one a second after it, not all at once.

## 2.10.0 - 2026-10-12

### What's new

**Attack artwork**
- Hogger now throws his axe, which tumbles as it falls, in place of the fireball he borrowed.
- Your arrows are drawn as arrows, pointing the way they fly, instead of thin gold lines.

### For developers
- All 30 pictures of the attack pack are in `game/assets/attacks/`: one attack per boss in
  `alliance/` and `horde/`, eight spells in `spells/` and two area effects in `area/`. Only
  Hogger's axe and the arrow are used so far.
- A boss's attack is the `attack` entry of its boss in `game/data/bosses.js`, drawn by
  `game/classes/BossProjectile.js`.
- The build leaves `assets/bosses/` and `assets/attacks/` at the size they were added at, and
  takes about half a minute again.

## 2.9.0 - 2026-10-12

### What's new

**Levelling**
- Levels now come from experience: every item caught gives experience, and each level needs
  more of it than the one before. The first levels go by in seconds (level 2 after about 10
  seconds of good play, level 5 after about a minute); later ones take longer (level 10 after
  about 3 minutes, level 20 after about 12).
- Items are worth 12% more with every level, in points and in experience, so later levels
  stay reachable.
- The player panel shows how far through the level you are ("Level 5 · 62%").

**Rare items are held back**
- Each rarity starts dropping at its own level: green items from level 2, epics from 4,
  specials from 6, the Dragonstalker set and the two tier weapons from 8, Thunder Fury from
  10 and Zee Zgnan Tigar from 12. Level 1 only drops regular items.

### For developers
- Levelling is `game/utils/progression.js` with its numbers under `progression` in
  `game/config/gameConfig.js`. The older time-based system is still in the code
  (`levels.progressionType`).
- The server also holds rare drops back by time (`not_before_seconds` in `config/loot.php`).
- The artwork for all 20 zone bosses is in `game/assets/bosses/<side>/`; only Hogger has a
  fight so far. The uploaded originals in `game-art/` are kept out of git.

## 2.8.0 - 2026-10-12

### What's new

**Boss fights**
- Alliance players meet Hogger on reaching level 5. Normal drops stop, Hogger comes in at
  the top of the screen with a health bar, and the level does not move on until he is down.
- He follows you, throws fireballs at you, and every few seconds sends a whole row across
  the screen with one gap to stand in.
- Bring him down with arrows (Autoshot and Multishot). Critical hits count, and arrow
  bundles and the odd health potion drop during the fight.
- The longer you survive, the weaker he gets: arrows do 2% more damage for every second of
  the fight, shown on his health bar.
- Defeating him gives 150 points and restores 30 health. Dying to him ends the game as usual.

### For developers
- Bosses are listed in `game/data/bosses.js` (side, level, health, attacks, reward) with
  their pictures in `game/assets/bosses/`; the fight itself is `game/systems/bossSystem.js`
  and its tuning is under `bosses` in `game/config/gameConfig.js`.

## 2.7.0 - 2026-10-12

### What's new

**Alliance or Horde**
- The main menu asks which side you play on, with a plaque for each. The choice is
  remembered, and a game cannot start without one.
- The chosen side's starting zone is on screen straight away, on the menu and when a game
  starts.
- On screens wider than a phone the buttons under Start Game sit two to a row, so the menu
  still fits without scrolling.
- Each side has its own series of ten landmark backgrounds that the game moves through as the
  levels go up, fading from one to the next: Northshire Abbey to Aerie Peak for the Alliance,
  the Valley of Trials to Gadgetzan for the Horde.
- The side played is recorded with each game.

### For developers
- Backgrounds are listed per side in `game/data/backgrounds.js`, with the pictures in
  `game/assets/backgrounds/<side>/`. When the game moves on is set under `backgrounds` in
  `game/config/gameConfig.js` (for now: every 2 levels, starting again after the last).
- New column `games.faction`: run `php artisan migrate`.
- The game's scripts and styles are now sent with `Cache-Control: no-cache` (`public/.htaccess`),
  so a browser never runs an old copy of one file next to new copies of the others after an update.

## 2.6.0 - 2026-10-12

### What's new

**My Games**
- Logged-in players have a "My Games" page in the site menu: every game they have played,
  newest first, with the score, level, time and the rare items picked up in it.
- A collection shows which of the 21 rare items the player has found, and how many times.
- Games that were left early or went offline are listed and marked, but do not add to the
  totals or the collection.

## 2.5.0 - 2026-10-12

### What's new

**Every game is recorded**
- The site keeps a record of each game played: who played, the score, level and time, and
  what was picked up. Games left or closed part-way are recorded as abandoned.
- Rare items (epics, specials, the tier set, Thunder Fury and Zee Zgnan Tigar) are now handed
  out by the server, a little at a time during the game, and a pickup is only recorded if the
  server offered that item. Thunder Fury and Zee Zgnan Tigar no longer drop in the first minute.
- If the connection is lost for about 10 seconds the game carries on offline with random loot,
  says so, and does not count: it stays off the leaderboard.
- The leaderboard now only takes scores from games played to the end online, and shows the
  real time played.

### For developers
- New tables `games` and `game_drops`, and `scores.game_id`: run `php artisan migrate`.
- `POST /api/scores` is gone; a score is created when a game is finished. See the README.

## 2.4.0 - 2026-10-12

### What's new

**Phones**
- Items, power-ups and projectiles are the same size next to the player as on desktop; they
  used to be as big as the player or bigger.
- Things take as long to fall down the screen as on desktop. Projectiles used to arrive in
  about half the time, items about a quarter sooner.

**A quieter message bar**
- The bar at the top of the play field shows one message on phones and two elsewhere, is only
  as wide as its text and is more see-through, so it covers less of what is falling.
- Damage taken and blocked hits float above the player instead of appearing in the bar.
- Dodges, critical hits and buffs starting or ending no longer appear in the bar; they already
  show at the player or on the buff cards.

## 2.3.0 - 2026-10-12

### What's new

**The game is now I N P U T, and it has a site around it**
- Create an account or log in from the main menu. Logged-in players score under their account.
- Guests can still play straight away. They are given a random guest name they can find on the
  leaderboard, or can type their own.
- High scores are stored in a database instead of a file, and have a page of their own.
- Players can upload a profile image, cropped in the browser. It shows in the site header, on
  the high scores page and as the portrait in the game's player panel.
- New passwords need at least 12 characters and are checked against known data breaches. The
  forms show how strong a password is while it is typed.
- The landing page is the game under a site header with the menu and the account links.
- Clicking a menu link in the middle of a game pauses it and asks before leaving, so a game
  is not lost by accident.
- A small footer on every page carries the credit that used to sit inside the game.

**A new look**
- Warcraft-style menus, a Dragonstalker set tracker and a unit-frame player panel.

**Gameplay**
- Arrows only shoot down harmful projectiles; items and helpful spells have to be caught.
- Items of the same rarity are the same size, and every power-up is the same size.
- Helpful things glow green, harmful projectiles glow red.

**Sound**
- Sound effects no longer interrupt the game when they start, and can overlap.

### For developers
- Laravel 12 with Breeze at the repository root; the game moved to `game/` and builds into
  `public/game/`. See the README for setup, development and deployment.
- `php artisan scores:import <file>` imports an old `highscores.json`.

## 2.2.0 - 2026-10-11

### What's new

**Gameplay feels the same on every device**
- The game now runs at a fixed 60 steps per second and draws in between, so it plays at the same speed on 60Hz, 120Hz and 144Hz+ screens and stays smooth on all of them.
- Pausing really pauses: spell cooldowns and the level timer no longer keep running behind the pause menu.
- Pressing Escape to close the pause menu resumes the game instead of leaving it frozen.

**Fairer items on phones**
- Missed items are counted when they leave the visible screen. On high-density screens they used to fall a whole extra screen first, which delayed the penalty and slowed down new drops.
- Items and power-ups now drop across the full width of the screen instead of mostly on the left.
- Items near the left edge fall in from above like the rest instead of popping in at the top.
- Fast-falling items at high levels can no longer slip past the player between frames.

**Everything is the size it was meant to be**
- Icons are drawn at their intended size on phones. Small source images used to be shrunk to about half size while their hitboxes stayed full size.
- Weapons and spell effects with transparent padding are trimmed so the visible artwork fills its space, and nothing is stretched out of proportion.

**Faster and lighter**
- Sprites and their glows are rendered once at the size they're shown and reused every frame.
- Builds now resize oversized images automatically: about 10MB less to download.
- The shadowbolt impact sound plays again (it pointed at a file that didn't exist).

**High scores**
- Player names on the high score table can no longer inject HTML into the page.
- Score submissions are validated, rate limited and written safely when several arrive at once.

### For developers
- `npm test` runs the timing tests.
- `npm run assets:report` shows which images are larger than the game needs; `npm run build` optimizes them in `dist/`. See `tools/optimize-assets.js`.
- Falling items, power-ups and projectiles share one movement implementation in `classes/FallingObject.js`.
- Cross-origin access to the high score API is off by default; allow sites with `EFTO_ALLOWED_ORIGINS` (see `.env.example`).
