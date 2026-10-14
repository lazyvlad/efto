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
    public static function skipCost(int $zone): int
    {
        return max(0, $zone - 1) * (int) config('boss_loot.skip_cost_per_zone');
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

        return $boss['loot'][$rarity] + ['rarity' => $rarity];
    }

    /**
     * Whether this kill also drops the large quiver. Only for a hunter who does not have it:
     * each finds his own, from his side's bosses.
     */
    public static function rollQuiver(?User $user, string $side = 'alliance'): bool
    {
        if ($user === null || in_array($side, Gear::quiverSides($user), true)) {
            return false;
        }

        return random_int(0, PHP_INT_MAX - 1) / PHP_INT_MAX < (float) config('boss_loot.quiver.chance');
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
