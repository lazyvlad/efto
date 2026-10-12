<?php

namespace App\Http\Controllers;

use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\LootTable;
use Illuminate\View\View;

class ItemController extends Controller
{
    /**
     * Every item in the game, by rarity, with what catching it pays; and the bosses, with
     * what defeating them pays and what they drop.
     */
    public function index(): View
    {
        $rarities = [];
        foreach (LootTable::catalog() as $item) {
            $rarities[$item['type']][] = $item;
        }

        $groups = [];
        foreach ($rarities as $type => $items) {
            $groups[] = [
                'type' => $type,
                'coins' => Coins::format((int) config("loot.coins.$type", 0)),
                'items' => $items,
            ];
        }

        $bosses = [];
        foreach (BossLoot::catalog() as $side => $sideBosses) {
            foreach ($sideBosses as $index => $boss) {
                $bosses[$side][] = $boss + [
                    'zone' => $index + 1,
                    'coins' => Coins::format(($index + 1) * (int) config('loot.boss_coins_per_zone')),
                ];
            }
        }

        return view('items', [
            'groups' => $groups,
            'total' => count(LootTable::catalog()),
            'bosses' => $bosses,
            'chances' => config('boss_loot.chances'),
            'quiverName' => config('boss_loot.quiver.name'),
            'quiverChance' => round(config('boss_loot.quiver.chance') * 100),
            'skipCost' => Coins::format((int) config('boss_loot.skip_cost_per_zone')),
            'rushFee' => Coins::format((int) config('boss_loot.rush.entry_fee')),
        ]);
    }
}
