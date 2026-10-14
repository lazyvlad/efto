<?php

namespace App\Support;

use App\Models\BossDrop;
use App\Models\User;

/**
 * What an admin can give a player without their having earned it, and take back again:
 * the later zones of a side, and for each hunter the hunter sets, the large quiver and the
 * rest of the gear. Each hunter is given his own, as each finds his own.
 *
 * A zone is open to a player who has loot from every boss before it, so opening zones means
 * giving them an item from each of those bosses. Given loot is marked as such
 * (boss_drops.granted); taking it back never touches what the player earned.
 */
class Grants
{
    /**
     * Count the first bosses of a side as beaten: one opens zone 2, nine open zone 10, ten
     * leave nothing on that side unbeaten. A boss the player already has loot from is left
     * as it is.
     */
    public static function beatBosses(User $user, string $faction, int $count): void
    {
        $bosses = array_slice(config("boss_loot.bosses.$faction", []), 0, $count, true);
        $beaten = $user->bossDrops()->distinct()->pluck('boss_id')->all();

        foreach ($bosses as $bossId => $boss) {
            if (in_array($bossId, $beaten, true)) {
                continue;
            }

            // The plainest thing the boss drops
            $rarity = array_key_first($boss['loot']);

            BossDrop::create([
                'user_id' => $user->id,
                'boss_id' => $bossId,
                'item_id' => $boss['loot'][$rarity]['id'],
                'rarity' => $rarity,
                'dropped_at' => now(),
            ])->forceFill(['granted' => true])->save();
        }
    }

    /**
     * Take back the boss loot of a side that was given: the zones it opened close again,
     * as far as the player has not beaten those bosses since.
     */
    public static function takeBackBosses(User $user, string $faction): int
    {
        return $user->bossDrops()
            ->where('granted', true)
            ->whereIn('boss_id', array_keys(config("boss_loot.bosses.$faction", [])))
            ->delete();
    }

    /**
     * How many bosses of a side were counted as beaten for the player by an admin.
     */
    public static function grantedBosses(User $user, string $faction): int
    {
        return $user->bossDrops()
            ->where('granted', true)
            ->whereIn('boss_id', array_keys(config("boss_loot.bosses.$faction", [])))
            ->distinct()
            ->count('boss_id');
    }

    /** Both hunters' given set pieces, { alliance: [...], horde: [...] } */
    private static function piecesBySide(User $user): array
    {
        return collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => $user->grantedPieces($side)])->all();
    }

    /**
     * Give a hunter every piece of a set he does not have (with no side, both hunters).
     */
    public static function giveSet(User $user, string $setId, ?string $side = null): void
    {
        if ($side === null) {
            foreach (Gear::SIDES as $each) {
                self::giveSet($user, $setId, $each);
            }

            return;
        }

        $all = self::piecesBySide($user);
        $missing = array_diff(config("loot.sets.$setId.pieces", []), $user->caughtPieces($side));
        $all[$side] = array_values(array_unique(array_merge($all[$side], $missing)));

        $user->forceFill(['granted_pieces' => $all])->save();
    }

    /**
     * Take back the pieces of a set that were given to a hunter (with no side, both). Pieces
     * he picked up stay.
     */
    public static function takeBackSet(User $user, string $setId, ?string $side = null): void
    {
        $all = self::piecesBySide($user);
        if ($side === null) {
            foreach (Gear::SIDES as $each) {
                $all[$each] = array_values(array_diff($all[$each], config("loot.sets.$setId.pieces", [])));
            }
            $user->forceFill(['granted_pieces' => $all])->save();

            return;
        }

        $all[$side] = array_values(array_diff($all[$side], config("loot.sets.$setId.pieces", [])));

        $user->forceFill(['granted_pieces' => $all])->save();
    }

    /**
     * The gear given to a hunter, by item id: how many of each.
     *
     * @return array<string, int>
     */
    public static function grantedGear(User $user, string $side): array
    {
        return array_map('intval', (array) (($user->granted_gear ?? [])[$side] ?? []));
    }

    private static function keepGear(User $user, string $side, array $gear): void
    {
        $all = collect(Gear::SIDES)->mapWithKeys(fn ($each) => [$each => (object) self::grantedGear($user, $each)])->all();
        $all[$side] = (object) array_filter($gear);
        $user->forceFill(['granted_gear' => $all])->save();
    }

    /**
     * Give a hunter one of every piece of gear he can wear and does not have: his side's boss
     * loot, everything that falls in a game, and the large quiver. Not the clothes he starts
     * in (he has those) or the other side's loot (he never wears it).
     */
    public static function giveAllGear(User $user, string $side): void
    {
        $owned = Gear::owned($user, $side);
        $gear = self::grantedGear($user, $side);

        foreach (Gear::catalog() as $itemId => $item) {
            if (($item['side'] ?? $side) !== $side || Gear::isStarter($itemId) || ($owned[$itemId] ?? 0) > 0) {
                continue;
            }
            $gear[$itemId] = 1;
        }

        self::keepGear($user, $side, $gear);
    }

    /**
     * Take back the gear given to a hunter (the large quiver too). What he found stays.
     */
    public static function takeBackGear(User $user, string $side): void
    {
        self::keepGear($user, $side, []);
    }

    /**
     * Give a hunter the large quiver, or take back the one given. One he found from a boss
     * stays his.
     */
    public static function giveQuiver(User $user, string $side, bool $give = true): void
    {
        $gear = self::grantedGear($user, $side);
        if ($give) {
            $gear[Gear::LARGE_QUIVER] = 1;
        } else {
            unset($gear[Gear::LARGE_QUIVER]);
            // The quiver given before each hunter had his own was the Alliance hunter's
            if ($side === 'alliance' && $user->quiver) {
                $user->forceFill(['quiver' => false]);
            }
        }
        self::keepGear($user, $side, $gear);
    }

    /**
     * Everything at once, for one hunter or both: every boss of his side beaten, all his
     * side's boss loot and every other piece of gear, the large quiver, and every set.
     */
    public static function everything(User $user, ?string $side = null): void
    {
        foreach ($side === null ? Gear::SIDES : [$side] as $each) {
            self::beatBosses($user, $each, count(config("boss_loot.bosses.$each")));
            foreach (array_keys(config('loot.sets')) as $setId) {
                self::giveSet($user, $setId, $each);
            }
            self::giveAllGear($user->fresh(), $each);
        }
    }
}
