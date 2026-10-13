# Changelog

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
