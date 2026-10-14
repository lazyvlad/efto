<?php

namespace App\Http\Controllers;

use App\Support\BossLoot;
use App\Support\GameSettings;
use App\Support\Gear;
use App\Support\GuestName;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Vite;
use Illuminate\View\View;
use Throwable;

class GameController extends Controller
{
    /**
     * The landing page: the site header with the game in a frame under it.
     */
    public function home(): View
    {
        return view('home');
    }

    /**
     * Serve the game. The game is a self-contained front-end (built into public/game); this
     * hands it the page it expects plus what it needs to know about the visitor.
     */
    public function play(Request $request): Response
    {
        // public/game-src is a development link to the unbuilt source in game/
        $folder = config('game.serve') === 'source' ? 'game-src' : 'game';
        $indexPath = public_path($folder.'/index.html');

        abort_unless(
            is_file($indexPath),
            503,
            $folder === 'game'
                ? 'The game has not been built. Run "npm run build:game".'
                : 'public/game-src is missing. See "Development" in the README.'
        );

        $user = $request->user();

        $boot = [
            // An account that is not activated yet earns but cannot use: its quiver and set
            // pieces are held back here, and skipping and Boss Rush below
            'user' => $user ? [
                'name' => $user->name,
                'avatar' => $user->avatarUrl(),
                'coins' => (int) $user->coins,
                'verified' => $user->canUseRewards(),
                'quiver' => $user->canUseRewards() && $user->quiver,
                'pieces' => $user->canUseRewards() ? $user->setPieces() : [],
                // What the hunter is wearing, slot by slot (the game's character sheet)
                // (null until the player has chosen: the game then puts on what they own)
                'equipment' => $user->equipment === null || ! $user->canUseRewards()
                    ? null
                    : (object) Gear::valid($user, $user->equipment),
                // What the hunter takes into a game, of everything owned (null until chosen:
                // the game then takes what is worn and whatever else there is room for)
                'carried' => $user->carried === null || ! $user->canUseRewards()
                    ? null
                    : Gear::carried($user, $user->carried),
                // The sets saved on the character sheet
                'outfits' => $user->outfits ?? [],
                // The gear owned besides the sets, and how many of each (App\Support\Gear)
                'gear' => (object) ($user->canUseRewards() ? Gear::owned($user) : []),
                // The bags bought (their sizes) and the crafting materials brought back so far
                'bags' => $user->canUseRewards() ? ($user->bags ?? []) : [],
                'materials' => (object) ($user->materials ?? []),
                // The bosses the player has beaten: the ones they may fight again on their own
                'bosses' => $user->bossDrops()->distinct()->pluck('boss_id')->all(),
            ] : null,
            'guestName' => $user ? null : GuestName::forSession($request),
            // Skipping ahead: the price per zone and the furthest zone open to the player on each side
            'skip' => $user?->canUseRewards() ? [
                'costPerZone' => (int) config('boss_loot.skip_cost_per_zone'),
                'unlocked' => [
                    'alliance' => BossLoot::unlockedZone($user, 'alliance'),
                    'horde' => BossLoot::unlockedZone($user, 'horde'),
                ],
            ] : null,
            // Boss Rush: what a logged-in player pays to enter
            'rush' => $user?->canUseRewards() ? ['fee' => (int) config('boss_loot.rush.entry_fee')] : null,
            // Everything that can be worn besides the sets: where, what it gives, what it sells for
            'gear' => (object) Gear::catalog(),
            // Bags that can be bought: size in slots => price in copper
            'bagsForSale' => (object) config('loot.bags.for_sale'),
            // Settings changed in the admin section, by their place in the game's gameConfig
            'settings' => (object) app(GameSettings::class)->forGame(),
            'csrfToken' => csrf_token(),
            // Framed by the landing page, whose header already has the account links
            'embedded' => $request->boolean('embedded'),
            'urls' => [
                'scores' => route('scores.index'),
                'games' => route('games.open'),
                'collection' => route('collection'),
                'equipment' => route('equipment.update'),
                'outfits' => route('outfits.update'),
                'bags' => route('bags.buy'),
                'sell' => route('vendor.sell'),
                'verify' => route('verification.notice'),
                'history' => route('games.history'),
                'login' => route('login'),
                'register' => route('register'),
                'logout' => route('logout'),
                'profile' => route('profile.edit'),
            ],
        ];

        // The game's own files are addressed relative to its folder
        $head = '<base href="'.e(asset($folder)).'/">'."\n"
            .'    <script>window.INPUT_BOOT = '
            .json_encode($boot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES)
            .';</script>'."\n    "
            // The card shown when the game's address is posted in a chat or on social media
            .trim(view('layouts.social')->render())
            // Counted once: framed by the landing page, that page has already counted the visit
            .($request->boolean('embedded') ? '' : "\n    ".trim(view('layouts.analytics')->render()));

        $html = preg_replace('/<head(\s[^>]*)?>/i', "$0\n    ".$head, $this->hashed($folder, file_get_contents($indexPath)), 1);

        return response($html)
            ->header('Content-Type', 'text/html; charset=utf-8')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    /**
     * The built game's page with its scripts and styles taken from the site's own build
     * (Vite): one script and one stylesheet, each named after its contents, so every change
     * has an address no browser has seen and none can go on using an older copy. Pictures and
     * sounds keep their addresses in the game's folder.
     *
     * The unbuilt game (a development server) keeps the links of its own page.
     */
    private function hashed(string $folder, string $html): string
    {
        if ($folder !== 'game') {
            return $html;
        }

        try {
            $styles = Vite::asset('game/styles/game.css');
            $script = Vite::asset('game/game-modular.js');
        } catch (Throwable) {
            // The site was built without the game: the page's own links still work
            return $html;
        }

        // The stylesheets, as one, where the first of them was
        $html = preg_replace('/<link\b[^>]*\bhref="styles\/[^"]*"[^>]*>/i', '<link rel="stylesheet" href="'.e($styles).'">', $html, 1);
        $html = preg_replace('/\s*<link\b[^>]*\bhref="styles\/[^"]*"[^>]*>/i', '', $html);

        return preg_replace(
            '/<script\b[^>]*\bsrc="game-modular[^"]*"[^>]*><\/script>/i',
            '<script type="module" src="'.e($script).'"></script>',
            $html,
            1
        );
    }
}
