<?php

namespace App\Http\Controllers;

use App\Support\BossLoot;
use App\Support\GuestName;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\View\View;

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
            .';</script>';

        $html = preg_replace('/<head(\s[^>]*)?>/i', "$0\n    ".$head, file_get_contents($indexPath), 1);

        return response($html)
            ->header('Content-Type', 'text/html; charset=utf-8')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}
