# Changelog

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
