# I N P U T

A browser game with a Laravel site around it. Laravel provides accounts, the score API and
(later) more pages; the game itself is a self-contained front-end served at `/play`.

The landing page (`/`) is the site header - navigation, log in and register - with the game
in a frame under it. `/play` is the game on its own, filling the window. `/highscores` is the
leaderboard as a page.

## Layout

```
app/, routes/, resources/, database/   The Laravel site (accounts, score API, pages)
game/                                  The game's source and its build tooling
public/game/                           The built game (committed - see "Deploying")
public/build/                          The built site CSS/JS (committed)
```

- Guests can play without an account. They get a random guest name (kept for the browser
  session) and can type their own instead.
- Logged-in players always score under their account name, and their scores are tied to
  their account.
- Players can upload a profile image, cropped in the browser and stored as a 256px WebP under
  `storage/app/public/avatars` (served through the `public/storage` link).
- New passwords need 12 characters, must not appear in known breaches (checked with
  haveibeenpwned.com, without sending the password) and must not contain the player's name
  or email. The forms show a strength meter; it is advice, the rules above are enforced.
- Scores live in the `scores` table. `GET /api/scores` returns the leaderboard.
- Every game played is recorded in the `games` table, guests' games included. The game
  opens a record when it starts (`POST /api/games`) and closes it when it ends
  (`POST /api/games/{token}/finish`); a game left or closed part-way is handed in as
  abandoned the next time the game is opened.
- The server decides each game's rare loot (epic, special, tier set, legendary and Zee
  Zgnan items; see `config/loot.php`). The game asks for it 30 seconds of play at a time
  (`POST /api/games/{token}/drops`), so the browser never holds more than the next chunk,
  and a pickup only counts if the server offered that item to that game. The offers and
  pickups are the rows of `game_drops`.
- A game that cannot reach the server in time goes offline: rare items drop at random and
  the game is recorded as offline. Only games played to the end online put a score on the
  leaderboard.
- `config/loot.php` repeats the item list and weights from the game's own data;
  `tests/Feature/LootConfigTest.php` fails if the two drift apart.

## Setting up

Requires PHP 8.2+, Composer and MySQL. Node.js is only needed where you change and build
front-end code.

```bash
composer install
cp .env.example .env
php artisan key:generate
# edit .env: APP_URL and the DB_* settings
php install.php
```

`install.php` creates the database named in `DB_DATABASE`, runs the migrations and links
`public/storage` (for uploaded profile images). If that
database already exists it changes nothing - run `php artisan migrate` yourself in that case
(for example when the database was created empty by hand). The database user needs the right
to create databases.

Scores from the old JSON file can be brought in once with:

```bash
php artisan scores:import /path/to/highscores.json
```

### Where the site is hosted

- **At a domain root (production):** point the web server's document root at `public/`.
  For nginx that is `root /path/to/project/public;` with the usual Laravel `try_files` rule.
- **In a sub-folder of a shared Apache docroot (e.g. `https://dev.example.com/input/`):**
  nothing to configure. The `.htaccess` in the project root forwards everything into `public/`,
  and `APP_URL` must include the folder (`APP_URL=https://dev.example.com/input`).

## Development

```bash
npm install                 # site tooling (Vite, Tailwind)
npm --prefix game install   # game tooling
```

To work on the game without rebuilding after every change, serve the source directly:

```bash
ln -s ../game public/game-src
# in .env:
GAME_SERVE=source
```

`/play` then loads the unbuilt files from `game/`. This exposes the whole `game/` folder to
the web, so use it on development machines only. The first time, run a game build once so the
generated config files exist.

| Command | What it does |
|---|---|
| `npm run build` | Build the site's CSS/JS into `public/build/` |
| `npm run build:game` | Build the game into `public/game/` (minified, images optimized) |
| `npm run build:all` | Both |
| `php artisan test` | Site tests (accounts, game page, score API) |
| `npm run test:game` | Game tests (timing) |
| `npm --prefix game run assets:report` | List game images larger than the game needs |

Set `EFTO_BUILD_VERSION=x.y.z` when building the game to change the version it shows.

## Deploying

The built front-ends are committed, so the server needs no Node.js:

```bash
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

On a server's first deploy, set up `.env` and run `php install.php` in place of the `migrate`
line (see "Setting up").

Before committing a release, run `npm run build:all` and commit the changes under
`public/game/` and `public/build/` together with the source.

On the server, `.env` should have `APP_ENV=production`, `APP_DEBUG=false`, `GAME_SERVE=build`,
the real `APP_URL` and the database settings. `storage/` and `bootstrap/cache/` must be
writable by the web server user. If `public/storage` is missing (`install.php` was not used),
run `php artisan storage:link` once.

Password reset emails need a mail server: set the `MAIL_*` values in `.env`. With the default
(`MAIL_MAILER=log`) they are only written to `storage/logs/laravel.log`.
