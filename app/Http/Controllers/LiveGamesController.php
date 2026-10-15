<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Support\BossLoot;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Live games: the games being played right now, as the server knows them from what each game
 * tells it while it runs (every half a minute of play, and at each boss it brings down).
 */
class LiveGamesController extends Controller
{
    public function index(Request $request): View
    {
        $games = Game::live()
            ->with(['user', 'bossDrops' => fn ($drops) => $drops->orderBy('dropped_at')])
            ->latest('started_at')
            ->limit(100)
            ->get();

        // Asked by the page itself every few seconds: only the list, to put in place
        return view($request->boolean('list') ? 'live.list' : 'live.index', [
            'games' => $games,
            'bosses' => collect(BossLoot::catalog())->flatten(1)->keyBy('id'),
            'levelsPerZone' => (int) config('boss_loot.levels_per_zone'),
        ]);
    }
}
