<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\GameDrop;
use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\LootTable;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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

        $found = $this->rareItemsFound($user);
        $bossLoot = $this->bossLootFound($user);

        $legal = $user->games()->legal();

        return view('games.history', [
            'games' => $games,
            'catalog' => LootTable::rareCatalog(),
            'found' => $found,
            'bosses' => BossLoot::catalog(),
            'bossLoot' => $bossLoot,
            'coins' => Coins::format((int) $user->coins),
            'quiver' => (bool) $user->quiver,
            'quiverName' => config('boss_loot.quiver.name'),
            'stats' => [
                'played' => (clone $legal)->count(),
                'best' => (int) (clone $legal)->max('score'),
                'seconds' => (int) (clone $legal)->sum('game_time'),
            ],
        ]);
    }

    /**
     * Everything the logged-in player has collected over all their games, for the game's own
     * loot screen: their coins, the rare items and the boss loot, with how often each was found.
     */
    public function collection(Request $request): JsonResponse
    {
        $user = $request->user();
        $found = $this->rareItemsFound($user);
        $bossLoot = $this->bossLootFound($user);

        $items = array_map(
            fn (array $item) => $item + ['times' => (int) ($found[$item['id']] ?? 0)],
            array_values(LootTable::rareCatalog())
        );

        $bosses = [];
        foreach (BossLoot::catalog() as $side => $sideBosses) {
            foreach ($sideBosses as $boss) {
                $boss['loot'] = array_map(
                    fn (array $item) => $item + ['times' => (int) ($bossLoot[$item['id']] ?? 0)],
                    $boss['loot']
                );
                $bosses[$side][] = $boss;
            }
        }

        return response()->json([
            'coins' => (int) $user->coins,
            'quiver' => ['name' => config('boss_loot.quiver.name'), 'found' => (bool) $user->quiver],
            'items' => $items,
            'bosses' => $bosses,
        ]);
    }

    /**
     * How often the player found each rare item. Only games that count add to the collection.
     *
     * @return Collection<string, int>
     */
    private function rareItemsFound(User $user): Collection
    {
        return GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereHas('game', fn ($game) => $game->legal()->where('user_id', $user->id))
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');
    }

    /**
     * How often the player found each piece of boss loot. It is theirs whichever way the game ended.
     *
     * @return Collection<string, int>
     */
    private function bossLootFound(User $user): Collection
    {
        return $user->bossDrops()
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');
    }
}
