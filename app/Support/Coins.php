<?php

namespace App\Support;

use App\Models\Game;

/**
 * Money, kept in copper: 100 copper is a silver, 100 silver a gold.
 */
class Coins
{
    /**
     * What a game earned (see "coins" in config/loot.php).
     *
     * Rare items count by the drops the server offered and the player picked up. Common ones
     * count as the browser reported them, up to what the game can have spawned in the time
     * played. Each boss defeated pays by its zone.
     *
     * @param  array<string, int>  $items  pickup counts by item id, as the browser reported them
     */
    public static function earned(Game $game, array $items): int
    {
        $values = config('loot.coins');
        $total = 0;

        foreach ($game->pickups()->pluck('item_id') as $itemId) {
            $total += $values[LootTable::typeOf($itemId)] ?? 0;
        }

        // Common items, dearest first, so the allowance cuts off the cheapest
        $common = [];
        foreach ($items as $itemId => $count) {
            $type = LootTable::typeOf((string) $itemId);
            if ($type !== null && ! in_array($type, config('loot.server_types'), true)) {
                $common[] = ['value' => $values[$type] ?? 0, 'count' => (int) $count];
            }
        }
        usort($common, fn (array $a, array $b) => $b['value'] <=> $a['value']);

        $allowed = (int) ceil($game->game_time * config('loot.spawns_per_second') * config('loot.coins_spawn_allowance'));
        foreach ($common as $entry) {
            $count = min($entry['count'], $allowed);
            $total += $count * $entry['value'];
            $allowed -= $count;
        }

        foreach ($game->bossDrops()->pluck('boss_id') as $bossId) {
            $total += (BossLoot::boss($bossId)['zone'] ?? 0) * config('loot.boss_coins_per_zone');
        }

        return $total;
    }

    /**
     * An amount as players read it: "3g 20s 5c".
     */
    public static function format(int $copper): string
    {
        $parts = [];
        if ($copper >= 10000) {
            $parts[] = number_format(intdiv($copper, 10000)).'g';
        }
        if ($copper >= 100 && intdiv($copper, 100) % 100 > 0) {
            $parts[] = (intdiv($copper, 100) % 100).'s';
        }
        if ($copper % 100 > 0 || $parts === []) {
            $parts[] = ($copper % 100).'c';
        }

        return implode(' ', $parts);
    }
}
