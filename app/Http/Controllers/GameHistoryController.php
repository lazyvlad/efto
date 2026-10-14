<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\Gear;
use App\Support\HunterRecord;
use App\Support\LootTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class GameHistoryController extends Controller
{
    /**
     * The logged-in player's games and what they found, one hunter at a time (?hunter=):
     * his games newest first with how each boss fight went, his record against each boss of
     * his side, and his collection. The purse is both hunters'.
     */
    public function index(Request $request): View
    {
        $user = $request->user();
        $side = in_array($request->query('hunter'), Gear::SIDES, true) ? $request->query('hunter') : HunterRecord::lastPlayed($user);

        // Games still open are in progress, or were never handed in
        $games = Gear::onSide($user->games(), $side)
            ->where('status', '!=', Game::OPEN)
            ->with(['pickups', 'bossDrops' => fn ($drops) => $drops->orderBy('dropped_at')])
            ->latest('started_at')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return view('games.history', [
            'side' => $side,
            'games' => $games,
            'catalog' => LootTable::rareCatalog(),
            'found' => HunterRecord::rareItemsFound($user, $side),
            'bosses' => BossLoot::catalog()[$side] ?? [],
            'bossLoot' => HunterRecord::bossLootFound($user, $side),
            'records' => HunterRecord::bossRecords($user, $side),
            'coins' => Coins::format((int) $user->coins),
            'quiver' => in_array($side, Gear::quiverSides($user), true),
            'quiverName' => config('boss_loot.quiver.name'),
            'sets' => LootTable::sets($user->setPieces($side)),
            'stats' => HunterRecord::stats($user, $side),
            'hasGames' => $user->games()->where('status', '!=', Game::OPEN)->exists(),
        ]);
    }

    /**
     * Everything one hunter has collected over all his games (?side=, the one played last by
     * default), for the game's own loot screen: the purse, his rare items and boss loot with
     * how often each was found, his sets and whether he has the large quiver.
     */
    public function collection(Request $request): JsonResponse
    {
        $user = $request->user();
        $side = in_array($request->query('side'), Gear::SIDES, true) ? $request->query('side') : HunterRecord::lastPlayed($user);
        $found = HunterRecord::rareItemsFound($user, $side);
        $bossLoot = HunterRecord::bossLootFound($user, $side);

        $items = array_map(
            fn (array $item) => $item + ['times' => (int) ($found[$item['id']] ?? 0)],
            array_values(LootTable::rareCatalog())
        );

        // His side's bosses: the other side's are the other hunter's
        $bosses = [];
        foreach (BossLoot::catalog()[$side] ?? [] as $boss) {
            $boss['loot'] = array_map(
                fn (array $item) => $item + ['times' => (int) ($bossLoot[$item['id']] ?? 0)],
                $boss['loot']
            );
            $bosses[$side][] = $boss;
        }

        return response()->json([
            'side' => $side,
            'coins' => (int) $user->coins,
            'quiver' => ['name' => config('boss_loot.quiver.name'), 'found' => in_array($side, Gear::quiverSides($user), true)],
            'sets' => LootTable::sets($user->setPieces($side)),
            'items' => $items,
            'bosses' => $bosses,
        ]);
    }

}
