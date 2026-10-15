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
        // Set pieces this game may still be offered
        $piecesLeft = (int) config('loot.set_pieces_per_game', PHP_INT_MAX)
            - count(array_intersect($alreadyOffered, config('loot.items.set_piece')));

        foreach (config('loot.server_types') as $type) {
            $weight = config("loot.weights.$type");
            // No waiting for a rarity the game had already unlocked when it started
            $notBefore = $startLevel >= config("loot.unlock_level.$type", PHP_INT_MAX)
                ? 0
                : (int) config("loot.not_before_seconds.$type", 0);

            foreach (array_diff(config("loot.items.$type"), config('loot.never_falls', [])) as $itemId) {
                // A piece of a hunter set waits for its own set's level, not its rarity's
                $waitsUntil = $notBefore;
                if ($set = self::setOf($itemId)) {
                    $waitsUntil = $startLevel >= $set['from_level'] ? 0 : (int) $set['not_before_seconds'];
                }

                $once = in_array($itemId, config('loot.once_per_game'), true);
                if ($once && in_array($itemId, $alreadyOffered, true)) {
                    continue;
                }

                // Each spawn picks this item with chance weight / total, as the game does itself
                // (a set piece, only a share of that)
                $share = $type === 'set_piece' ? (float) config('loot.set_piece_share', 1) : 1.0;
                $count = self::poisson($spawns * $weight * $share / $totalWeight);

                for ($i = 0; $i < ($once ? min(1, $count) : $count); $i++) {
                    $at = $start + random_int(0, $chunkSeconds - 1);
                    if ($at >= $waitsUntil) {
                        $drops[] = ['item_id' => $itemId, 'at_seconds' => $at];
                    }
                }
            }
        }

        // No more set pieces than the game has left, whichever they are
        $pieces = array_filter($drops, fn (array $drop) => self::setOf($drop['item_id']) !== null);
        if (count($pieces) > max(0, $piecesLeft)) {
            $cut = array_keys($pieces);
            shuffle($cut);
            foreach (array_slice($cut, max(0, $piecesLeft)) as $key) {
                unset($drops[$key]);
            }
            $drops = array_values($drops);
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
     * The hunter set an item is a piece of, with its id, or null for anything else.
     *
     * @return array{id: string, name: string, tier: int, from_level: int, not_before_seconds: int, pieces: array<int, string>}|null
     */
    public static function setOf(string $itemId): ?array
    {
        foreach (config('loot.sets') as $setId => $set) {
            if (in_array($itemId, $set['pieces'], true)) {
                return ['id' => $setId] + $set;
            }
        }

        return null;
    }

    /**
     * The hunter sets as the site shows them, lowest tier first, each piece marked with
     * whether it is among the ids given.
     *
     * @param  array<int, string>  $owned  ids of the pieces a player has
     * @return array<int, array{id: string, name: string, tier: int, owned: int, pieces: array<int, array{id: string, name: string, image: string, owned: bool}>}>
     */
    public static function sets(array $owned = []): array
    {
        $catalog = self::catalog();
        $sets = [];

        foreach (config('loot.sets') as $setId => $set) {
            $pieces = array_map(
                fn (string $itemId) => [
                    'id' => $itemId,
                    'name' => $catalog[$itemId]['name'],
                    'image' => $catalog[$itemId]['image'],
                    'owned' => in_array($itemId, $owned, true),
                ],
                $set['pieces']
            );

            $sets[] = [
                'id' => $setId,
                'name' => $set['name'],
                'tier' => $set['tier'],
                'owned' => count(array_filter($pieces, fn (array $piece) => $piece['owned'])),
                'pieces' => $pieces,
            ];
        }

        return $sets;
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
     * Every item in the game as the site shows it, rarest first.
     *
     * @return array<string, array{id: string, name: string, type: string, image: string}>
     */
    public static function catalog(): array
    {
        $catalog = [];
        foreach (config('loot.catalog') as $itemId => $item) {
            $catalog[$itemId] = [
                'id' => $itemId,
                'name' => $item['name'],
                'type' => self::typeOf($itemId),
                'image' => asset('game/'.$item['image']),
            ];
        }

        return $catalog;
    }

    /**
     * The rare items only: the ones the server decides, which a player's collection is made of.
     *
     * @return array<string, array{id: string, name: string, type: string, image: string}>
     */
    public static function rareCatalog(): array
    {
        return array_filter(
            self::catalog(),
            fn (array $item) => in_array($item['type'], config('loot.server_types'), true)
        );
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
