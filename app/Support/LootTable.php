<?php

namespace App\Support;

/**
 * Rolls the rare items a game is offered, one chunk of play at a time (see config/loot.php).
 */
class LootTable
{
    /**
     * The rare drops for one chunk, in the order they appear.
     *
     * @param  array<int, string>  $alreadyOffered  item ids offered earlier in the same game
     * @param  int  $startLevel  the level the game started at (above 1 when the player skipped ahead)
     * @return array<int, array{item_id: string, at_seconds: int}>
     */
    public static function rollChunk(int $chunk, array $alreadyOffered = [], int $startLevel = 1): array
    {
        $chunkSeconds = (int) config('loot.chunk_seconds');
        $start = $chunk * $chunkSeconds;
        $spawns = config('loot.spawns_per_second') * $chunkSeconds;
        $totalWeight = self::totalWeight();
        $drops = [];

        foreach (config('loot.server_types') as $type) {
            $weight = config("loot.weights.$type");
            // No waiting for a rarity the game had already unlocked when it started
            $notBefore = $startLevel >= config("loot.unlock_level.$type", PHP_INT_MAX)
                ? 0
                : (int) config("loot.not_before_seconds.$type", 0);

            foreach (config("loot.items.$type") as $itemId) {
                $once = in_array($itemId, config('loot.once_per_game'), true);
                if ($once && in_array($itemId, $alreadyOffered, true)) {
                    continue;
                }

                // Each spawn picks this item with chance weight / total, as the game does itself
                $count = self::poisson($spawns * $weight / $totalWeight);

                for ($i = 0; $i < ($once ? min(1, $count) : $count); $i++) {
                    $at = $start + random_int(0, $chunkSeconds - 1);
                    if ($at >= $notBefore) {
                        $drops[] = ['item_id' => $itemId, 'at_seconds' => $at];
                    }
                }
            }
        }

        usort($drops, fn (array $a, array $b) => $a['at_seconds'] <=> $b['at_seconds']);

        return $drops;
    }

    /**
     * Whether the server decides when this item drops.
     */
    public static function decides(string $itemId): bool
    {
        foreach (config('loot.server_types') as $type) {
            if (in_array($itemId, config("loot.items.$type"), true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * The rarity of an item, or null for an item the game does not have.
     */
    public static function typeOf(string $itemId): ?string
    {
        foreach (config('loot.items') as $type => $ids) {
            if (in_array($itemId, $ids, true)) {
                return $type;
            }
        }

        return null;
    }

    /**
     * The rare items as the site shows them, rarest first.
     *
     * @return array<string, array{id: string, name: string, image: string}>
     */
    public static function catalog(): array
    {
        $catalog = [];
        foreach (config('loot.catalog') as $itemId => $item) {
            $catalog[$itemId] = [
                'id' => $itemId,
                'name' => $item['name'],
                'image' => asset('game/'.$item['image']),
            ];
        }

        return $catalog;
    }

    /**
     * @return array<int, string>
     */
    public static function itemIds(): array
    {
        return array_merge(...array_values(config('loot.items')));
    }

    private static function totalWeight(): float
    {
        $total = 0.0;
        foreach (config('loot.items') as $type => $ids) {
            $total += config("loot.weights.$type") * count($ids);
        }

        return $total;
    }

    /**
     * A Poisson-distributed count with the given mean (Knuth's method; means here are well under 1).
     */
    private static function poisson(float $mean): int
    {
        $limit = exp(-$mean);
        $count = 0;
        $product = 1.0;

        do {
            $count++;
            $product *= random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX;
        } while ($product > $limit);

        return $count - 1;
    }
}
