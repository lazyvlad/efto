<?php

namespace App\Support;

use App\Models\Game;
use App\Models\User;

/**
 * The hunter's bags, and what a finished game comes to because of them.
 *
 * Everything caught in a game goes into the bags: a slot holds a stack of one kind. What is
 * only worth selling is sold for its coins when the game ends; a crafting material stays in
 * the bags instead, from one game to the next (users.bag_contents), with whatever was crafted
 * from such things (config/crafting.php). Between games the player moves materials between
 * the bags and the bank (users.materials, without limit), and crafts from what is in the bags.
 * Once the bags are full, what is caught has nowhere to go and is sold on the spot for less;
 * a material sold that way is not kept. Pieces of the hunter sets are worn, not carried, and
 * take no room.
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
        $stacks = config('loot.bags.item_stacks', []);

        $slots = 0;
        foreach ($contents as $itemId => $count) {
            $slots += (int) ceil($count / ($stacks[$itemId] ?? $stack));
        }

        return $slots;
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

        // More carried than the bags hold, with what was in them when the game began: the
        // game's account of them cannot be right, and everything is paid as if there had been
        // no room for it
        $stored = self::contents($game->user);
        if (self::slotsUsed(self::plus($stored, array_filter($carried))) > self::capacity($game->user)) {
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
     * What is in a player's bags between games: [itemId => count].
     *
     * @return array<string, int>
     */
    public static function contents(?User $user): array
    {
        return array_filter(array_map('intval', $user?->bag_contents ?? []), fn (int $count) => $count > 0);
    }

    /** Whether a thing can be kept in the bags between games and in the bank: a material, or something crafted */
    public static function keepable(string $itemId): bool
    {
        return in_array($itemId, config('loot.materials'), true) || array_key_exists($itemId, config('crafting.items'));
    }

    /**
     * After a game: what was drunk or shot from the bags is gone ($used: [itemId => count], no
     * more than there was), and the materials it brought back ($kept) and what it put in them
     * ($stored: potions, spare arrows) stay in the bags with what was there. What it says it
     * stored is believed only as far as the time played allows (crafting.stored_per_minute) and
     * there is room.
     *
     * @param  array<string, int>  $kept
     * @param  array<string, int>  $used
     * @param  array<string, int>  $stored
     */
    public static function afterGame(User $user, array $kept, array $used = [], array $stored = [], int $gameSeconds = 0): void
    {
        $contents = self::contents($user);
        foreach ($used as $itemId => $count) {
            if (isset($contents[$itemId])) {
                $contents[$itemId] -= min($contents[$itemId], max(0, (int) $count));
            }
        }
        $contents = self::plus(array_filter($contents), $kept);

        $perMinute = config('crafting.stored_per_minute', []);
        foreach ($stored as $itemId => $count) {
            $most = (int) ceil(($perMinute[$itemId] ?? 0) * max(1, $gameSeconds) / 60);
            $count = min(max(0, (int) $count), $most);
            while ($count > 0 && self::slotsUsed(self::plus($contents, [$itemId => $count])) > self::capacity($user)) {
                $count--;
            }
            $contents = self::plus($contents, [$itemId => $count]);
        }
        if ($contents === self::contents($user)) {
            return;
        }

        $user->forceFill(['bag_contents' => array_filter($contents)])->save();
    }

    /**
     * Move a stack between the bank and the bags. Into the bags only as far as they have
     * room. Returns why it cannot be, or null when it was moved.
     */
    public static function move(User $user, string $itemId, int $count, bool $toBags): ?string
    {
        $bank = array_map('intval', $user->materials ?? []);
        $contents = self::contents($user);
        $from = $toBags ? ($bank[$itemId] ?? 0) : ($contents[$itemId] ?? 0);
        if ($count < 1 || $count > $from) {
            return $toBags ? 'There is not that much of it in the bank.' : 'There is not that much of it in your bags.';
        }

        if ($toBags) {
            $contents = self::plus($contents, [$itemId => $count]);
            if (self::slotsUsed($contents) > self::capacity($user)) {
                return 'There is no room for that much in your bags.';
            }
            $bank[$itemId] -= $count;
        } else {
            $contents[$itemId] -= $count;
            $bank[$itemId] = ($bank[$itemId] ?? 0) + $count;
        }

        $user->forceFill(['bag_contents' => array_filter($contents), 'materials' => array_filter($bank)])->save();

        return null;
    }

    /**
     * Make so many of a recipe from what is in the bags; what is made goes into them. Returns
     * why it cannot be, or null when it was made.
     */
    public static function craft(User $user, string $recipeId, int $count): ?string
    {
        $needs = config("crafting.recipes.{$recipeId}");
        if (! is_array($needs) || $count < 1) {
            return 'There is no such recipe.';
        }

        $contents = self::contents($user);
        foreach ($needs as $itemId => $each) {
            if (($contents[$itemId] ?? 0) < $each * $count) {
                return 'There is not enough of what it takes in your bags.';
            }
            $contents[$itemId] -= $each * $count;
        }
        $contents = self::plus(array_filter($contents), [$recipeId => $count]);
        if (self::slotsUsed($contents) > self::capacity($user)) {
            return 'There is no room in your bags for what it makes.';
        }

        $user->forceFill(['bag_contents' => $contents])->save();

        return null;
    }

    /** Two lots of things together: [itemId => count] */
    private static function plus(array $a, array $b): array
    {
        foreach ($b as $itemId => $count) {
            $a[$itemId] = ($a[$itemId] ?? 0) + (int) $count;
        }

        return array_filter($a, fn (int $count) => $count > 0);
    }
}
