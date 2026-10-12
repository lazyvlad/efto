<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\GameDrop;
use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\LootTable;
use Illuminate\Http\Request;
use Illuminate\View\View;

class GameHistoryController extends Controller
{
    /**
     * The logged-in player's games, newest first, the rare items they have found, their
     * boss loot and their money.
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        // Games still open are in progress, or were never handed in
        $games = $user->games()
            ->where('status', '!=', Game::OPEN)
            ->with('pickups')
            ->latest('started_at')
            ->latest('id')
            ->paginate(20);

        // Only games that count add to the collection
        $found = GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereHas('game', fn ($game) => $game->legal()->where('user_id', $user->id))
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');

        // Boss loot is the player's whichever way the game ended
        $bossLoot = $user->bossDrops()
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');

        $legal = $user->games()->legal();

        return view('games.history', [
            'games' => $games,
            'catalog' => LootTable::catalog(),
            'found' => $found,
            'bosses' => BossLoot::catalog(),
            'bossLoot' => $bossLoot,
            'coins' => Coins::format((int) $user->coins),
            'stats' => [
                'played' => (clone $legal)->count(),
                'best' => (int) (clone $legal)->max('score'),
                'seconds' => (int) (clone $legal)->sum('game_time'),
            ],
        ]);
    }
}
