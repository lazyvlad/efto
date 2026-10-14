<?php

namespace App\Support;

use App\Models\Game;
use App\Models\User;

/**
 * The hunter's bags, and what a finished game comes to because of them.
 *
 * Everything caught in a game goes into the bags: a slot holds a stack of one kind. What is
 * only worth selling is sold for its coins when the game ends; a crafting material is kept on
 * the account instead. Once the bags are full, what is caught has nowhere to go and is sold
 * on the spot for less; a material sold that way is not kept. Pieces of the hunter sets are
 * worn, not carried, and take no room.
 *
 * The game keeps the bags as it is played (game/utils/bags.js) and says, when it ends, how
 * much of each thing did not fit. The site works out the pay from that, and does not take the
 * game's word for more than the bags can hold.
 */
class Bags
{
    /**
     * How many slots a player's bags have: the backpack, and the bags they have bought.
     */
    public static function capacity(?User $user): int
    {
        $bags = array_slice($user?->bags ?? [], 0, (int) config('loot.bags.bag_slots'));

        return (int) config('loot.bags.backpack') + array_sum($bags);
    }

    /**
     * How many slots these things take: [itemId => count].
     */
    public static function slotsUsed(array $contents): int
    {
        $stack = (int) config('loot.bags.stack');

        return array_sum(array_map(fn (int $count) => (int) ceil($count / $stack), $contents));
    }

    /**
     * What something is sold for when there was no room for it. Gear that helps with carrying
     * takes some of the loss away ($carrying: 0.02 for two hundredths).
     */
    public static function soldShort(int $value, float $carrying = 0.0): int
    {
        $penalty = max(0.0, (float) config('loot.bags.full_penalty') - $carrying);

        return (int) round($value * (1 - $penalty));
    }

    /**
     * What a game comes to.
     *
     * @param  array<string, int>  $items  What the game says was caught: [itemId => count]
     * @param  array<string, int>  $overflow  How much of it did not fit in the bags
     * @return array{coins: int, materials: array<string, int>}  The coins it pays, and the
     *                                                           materials brought back
     */
    public static function settle(Game $game, array $items, array $overflow = []): array
    {
        $values = config('loot.coins');
        $materials = config('loot.materials');
        // Weapons and jewellery that fall are kept to wear or to sell later: they pay nothing
        // now and take no room (config/gear.php)
        $kept_gear = array_keys(config('gear.drops'));
        // What the gear being worn takes off the loss on things that did not fit
        $carrying = Gear::carrying($game->user, $game->faction);

        // What was caught, as far as the site believes it. The rare things it handed out
        // itself; the common ones as the game reports them, but no more than can have fallen
        // in the time played, the dearest counted first.
        $caught = array_count_values($game->pickups()->pluck('item_id')->all());

        $common = [];
        foreach ($items as $itemId => $count) {
            $type = LootTable::typeOf((string) $itemId);
            if ($type !== null && ! in_array($type, config('loot.server_types'), true) && $count > 0) {
                $common[(string) $itemId] = (int) $count;
            }
        }
        uksort($common, fn (string $a, string $b) => ($values[LootTable::typeOf($b)] ?? 0) <=> ($values[LootTable::typeOf($a)] ?? 0));

        $allowed = (int) ceil($game->game_time * config('loot.spawns_per_second') * config('loot.coins_spawn_allowance'));
        foreach ($common as $itemId => $count) {
            $caught[$itemId] = min($count, $allowed);
            $allowed -= $caught[$itemId];
        }
        $caught = array_filter($caught);

        // What did not fit, as the game says, never more than was caught. Pieces of the
        // hunter sets are worn: they take no room and are never short of it.
        $carried = [];
        $short = [];
        foreach ($caught as $itemId => $count) {
            if (LootTable::typeOf($itemId) === 'set_piece' || in_array($itemId, $kept_gear, true)) {
                continue;
            }
            $short[$itemId] = max(0, min($count, (int) ($overflow[$itemId] ?? 0)));
            $carried[$itemId] = $count - $short[$itemId];
        }

        // More carried than the bags hold: the game's account of them cannot be right, and
        // everything is paid as if there had been no room for it
        if (self::slotsUsed(array_filter($carried)) > self::capacity($game->user)) {
            $short = array_map(fn (int $count, string $itemId) => $count + $short[$itemId], $carried, array_keys($carried));
            $short = array_combine(array_keys($carried), $short);
            $carried = array_map(fn () => 0, $carried);
        }

        $coins = 0;
        $kept = [];
        foreach ($caught as $itemId => $count) {
            $value = $values[LootTable::typeOf($itemId)] ?? 0;

            if (! array_key_exists($itemId, $carried)) {
                // A piece of a set is paid in full, as always; other gear is kept, unpaid
                if (! in_array($itemId, $kept_gear, true)) {
                    $coins += $count * $value;
                }

                continue;
            }

            $coins += $short[$itemId] * self::soldShort($value, $carrying);

            if (in_array($itemId, $materials, true)) {
                // Kept, not sold
                if ($carried[$itemId] > 0) {
                    $kept[$itemId] = $carried[$itemId];
                }
            } else {
                $coins += $carried[$itemId] * $value;
            }
        }

        foreach ($game->bossDrops()->pluck('boss_id') as $bossId) {
            $coins += (BossLoot::boss($bossId)['zone'] ?? 0) * config('loot.boss_coins_per_zone');
        }

        return ['coins' => $coins, 'materials' => $kept];
    }

    /**
     * Put materials brought back from a game in the player's keeping.
     *
     * @param  array<string, int>  $materials
     */
    public static function keep(User $user, array $materials): void
    {
        if ($materials === []) {
            return;
        }

        $bank = $user->materials ?? [];
        foreach ($materials as $itemId => $count) {
            $bank[$itemId] = ($bank[$itemId] ?? 0) + $count;
        }

        $user->forceFill(['materials' => $bank])->save();
    }
}
