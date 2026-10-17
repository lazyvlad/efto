<?php

namespace App\Support;

use App\Models\User;

/**
 * The bosses and what they drop (see config/boss_loot.php).
 */
class BossLoot
{
    /**
     * A boss by its id, with the side it belongs to and the zone it guards.
     *
     * @return array{id: string, faction: string, zone: int, name: string, image: string, loot: array<string, array{id: string, name: string}>}|null
     */
    public static function boss(string $bossId): ?array
    {
        foreach (config('boss_loot.bosses') as $faction => $bosses) {
            $zone = array_search($bossId, array_keys($bosses), true);

            if ($zone !== false) {
                return ['id' => $bossId, 'faction' => $faction, 'zone' => $zone + 1] + $bosses[$bossId];
            }
        }

        return null;
    }

    /**
     * The furthest zone a player may start a game in on this side: one past the bosses they
     * have defeated in a row from the first (they own loot from each).
     */
    public static function unlockedZone(User $user, string $faction): int
    {
        $bosses = array_keys(config("boss_loot.bosses.$faction", []));
        $beaten = $user->bossDrops()->distinct()->pluck('boss_id')->all();
        $zone = 1;

        foreach ($bosses as $bossId) {
            if (! in_array($bossId, $beaten, true)) {
                break;
            }
            $zone++;
        }

        return max(1, min($zone, count($bosses)));
    }

    /**
     * What starting a game in this zone costs, in copper.
     */
    public static function skipCost(int $zone, ?User $user = null): int
    {
        return max(0, $zone - 1) * self::skipCostPerZone($user);
    }

    /**
     * What skipping one zone costs the player: nothing for an admin, who opens zones and bosses
     * to test them (admin "Unlock everything") without having to fill his purse as well.
     */
    public static function skipCostPerZone(?User $user = null): int
    {
        return $user?->is_admin ? 0 : (int) config('boss_loot.skip_cost_per_zone');
    }

    /** What entering Boss Rush costs the player: nothing for an admin, as skipping */
    public static function rushFee(?User $user = null): int
    {
        return $user?->is_admin ? 0 : (int) config('boss_loot.rush.entry_fee');
    }

    /**
     * Pick what a boss drops this time.
     *
     * @return array{id: string, name: string, rarity: string}
     */
    public static function roll(array $boss): array
    {
        $chances = config('boss_loot.chances');
        $rarity = array_key_last($chances);
        $at = random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX;

        foreach ($chances as $name => $chance) {
            if ($at < $chance) {
                $rarity = $name;
                break;
            }
            $at -= $chance;
        }

        // Then by weight: the boss's own item of that rarity, and the rest of its pool
        $pool = self::pool($boss, $rarity);
        $at = random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX * array_sum($pool);
        foreach ($pool as $itemId => $weight) {
            if ($at < $weight) {
                return self::item($boss, $itemId);
            }
            $at -= $weight;
        }

        return $boss['loot'][$rarity] + ['rarity' => $rarity];
    }

    /**
     * What a boss may drop of a rarity, by weight: its own item, and the items of its pool that
     * are in the game (config/boss_loot.php "pools").
     *
     * @return array<string, int>
     */
    public static function pool(array $boss, string $rarity): array
    {
        $catalog = Gear::catalog();
        $pool = [$boss['loot'][$rarity]['id'] => (int) config("boss_loot.native_weight.$rarity", 1)];
        foreach (config("boss_loot.pools.{$boss['id']}.$rarity", []) as $itemId => $weight) {
            if (isset($catalog[$itemId])) {
                $pool[$itemId] = (int) $weight;
            }
        }

        return $pool;
    }

    /**
     * The zone's gear an early boss drops besides its item, in a normal game (boss_loot.extras):
     * by item id, none the same, nor the item it dropped. Each a piece his side's hunter lacks
     * (any once he has them all), of the rarity rolled where there is one of it.
     *
     * @return array<int, string>
     */
    public static function rollExtras(?User $user, array $boss, string $mode, string $itemId): array
    {
        $count = (int) config("boss_loot.extras.zones.{$boss['zone']}", 0);
        if ($count === 0 || $mode !== \App\Models\Game::NORMAL) {
            return [];
        }

        $catalog = Gear::catalog();
        $zoneItems = array_filter(config("gear.zone_items.{$boss['faction']}.{$boss['zone']}", []),
            fn ($item, $id) => isset($catalog[$id]) && $id !== $itemId, ARRAY_FILTER_USE_BOTH);
        $owned = $user ? Gear::owned($user, $boss['faction']) : [];
        $chances = config('boss_loot.extras.chances');

        $chosen = [];
        for ($i = 0; $i < $count; $i++) {
            $left = array_diff_key($zoneItems, array_flip($chosen));
            if ($left === []) {
                break;
            }
            // What he lacks comes first; among it, the rarity rolled if there is one of it
            $lacking = array_diff_key($left, $owned) ?: $left;
            $rarity = self::pick($chances);
            $ofRarity = array_filter($lacking, fn ($item) => $item['rarity'] === $rarity) ?: $lacking;
            $ids = array_keys($ofRarity);
            $chosen[] = $ids[random_int(0, count($ids) - 1)];
        }

        return $chosen;
    }

    /** A name, by the chances given (adding up to 1) */
    private static function pick(array $chances): string
    {
        $at = random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX;
        foreach ($chances as $name => $chance) {
            if ($at < $chance) {
                return $name;
            }
            $at -= $chance;
        }

        return array_key_last($chances);
    }

    /**
     * Whether this kill also drops the large quiver. Only for a hunter who does not have it:
     * each finds his own, from his side's bosses.
     */
    public static function rollQuiver(?User $user, string $side = 'alliance', int $zone = 1): bool
    {
        if ($user === null || in_array($side, Gear::quiverSides($user), true)) {
            return false;
        }
        if ($zone < (int) config('boss_loot.quiver.from_zone', 1)) {
            return false;
        }

        return random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX < (float) config('boss_loot.quiver.chance');
    }

    /**
     * A piece of the zone's hunter set this kill drops besides its item (boss_loot.set_pieces):
     * one the side's hunter does not have yet, or for a guest any of the set. Null for none.
     */
    public static function rollSetPiece(?User $user, array $boss): ?string
    {
        $rules = config("boss_loot.set_pieces.{$boss['zone']}");
        if (! $rules || random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX >= (float) $rules['chance']) {
            return null;
        }

        $pieces = $rules['pieces'];
        if ($user !== null) {
            $pieces = array_values(array_diff($pieces, $user->setPieces($boss['faction'])));
        }

        return $pieces ? $pieces[array_rand($pieces)] : null;
    }

    /**
     * The size of a bag this kill drops besides its item (boss_loot.bags), for a logged-in
     * player who can use it: only one that would go on, into a free bag slot or in place of a
     * smaller bag. Null for none.
     */
    public static function rollBag(?User $user, array $boss): ?int
    {
        $rules = config('boss_loot.bags');
        $sizes = $rules['sizes'][$boss['zone']] ?? [];
        if ($user === null || ! $user->keepsLoot() || ! $sizes || $boss['zone'] < (int) $rules['from_zone']
            || random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX >= (float) $rules['chance']) {
            return null;
        }

        $size = (int) $sizes[array_rand($sizes)];

        return Bags::wouldGoOn($user, $size) ? $size : null;
    }

    /**
     * The Bindings of the Windseeker a boss drops besides its item (boss_loot.bindings), for a
     * logged-in player's hunter: none from a boss before the zone they start in, none he has
     * already (in his bank or bags), and none once he has made Thunderfury. Ids of those that
     * dropped.
     *
     * @return array<int, string>
     */
    public static function rollBindings(?User $user, array $boss): array
    {
        $rules = config('boss_loot.bindings');
        // The Left from the ninth zone's boss, the Right from the tenth's
        $here = array_keys(array_filter(['left' => $rules['left_zone'] ?? null, 'right' => $rules['right_zone'] ?? null], fn ($zone) => (int) $zone === $boss['zone']));
        if ($user === null || ! $rules || (float) $rules['chance'] <= 0 || $here === []) {
            return [];
        }

        $side = $boss['faction'];
        if ((Gear::owned($user, $side)[$rules['makes']] ?? 0) > 0) {
            return [];
        }
        $has = Bags::contents($user, $side);
        foreach (Bags::bank($user, $side) as $itemId => $count) {
            $has[$itemId] = ($has[$itemId] ?? 0) + $count;
        }

        $dropped = [];
        foreach (array_map(fn ($hand) => $rules[$hand], $here) as $binding) {
            if (($has[$binding] ?? 0) < 1 && random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX < (float) $rules['chance']) {
                $dropped[] = $binding;
            }
        }

        return $dropped;
    }

    /**
     * One of a boss's items by its id.
     *
     * @return array{id: string, name: string, rarity: string}|null
     */
    public static function item(array $boss, string $itemId): ?array
    {
        foreach ($boss['loot'] as $rarity => $item) {
            if ($item['id'] === $itemId) {
                return $item + ['rarity' => $rarity];
            }
        }
        // One of its pool: named as the game names it
        foreach (config("boss_loot.pools.{$boss['id']}", []) as $rarity => $items) {
            if (isset($items[$itemId])) {
                return ['id' => $itemId, 'name' => Gear::catalog()[$itemId]['name'] ?? $itemId, 'rarity' => $rarity];
            }
        }

        // The zone's gear (boss_loot.extras)
        $zoneItem = Gear::zoneItems()[$itemId] ?? null;
        if ($zoneItem) {
            return ['id' => $itemId, 'name' => $zoneItem['name'], 'rarity' => $zoneItem['rarity']];
        }

        return null;
    }

    /**
     * Every boss as the site shows it, by side in zone order.
     *
     * @return array<string, array<int, array{id: string, name: string, image: string, loot: array<int, array{id: string, name: string, rarity: string}>}>>
     */
    public static function catalog(): array
    {
        $catalog = [];

        foreach (config('boss_loot.bosses') as $faction => $bosses) {
            foreach ($bosses as $bossId => $boss) {
                $loot = [];
                foreach ($boss['loot'] as $rarity => $item) {
                    $loot[] = $item + ['rarity' => $rarity];
                }

                $catalog[$faction][] = [
                    'id' => $bossId,
                    'name' => $boss['name'],
                    'image' => asset('game/'.$boss['image']),
                    'loot' => $loot,
                ];
            }
        }

        return $catalog;
    }
}
