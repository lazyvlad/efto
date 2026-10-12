# Changelog

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
