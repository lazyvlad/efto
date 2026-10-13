<?php

namespace App\Http\Controllers;

use App\Support\BossLoot;
use App\Support\GameSettings;
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
            // Settings changed in the admin section, by their place in the game's gameConfig
            'settings' => (object) app(GameSettings::class)->forGame(),
            'csrfToken' => csrf_token(),
            // Framed by the landing page, whose header already has the account links
            'embedded' => $request->boolean('embedded'),
            'urls' => [
                'scores' => route('scores.index'),
                'games' => route('games.open'),
                'collection' => route('collection'),
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
