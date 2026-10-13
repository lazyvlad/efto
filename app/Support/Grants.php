<?php

namespace App\Support;

use App\Models\BossDrop;
use App\Models\User;

/**
 * What an admin can give a player without their having earned it, and take back again:
 * the later zones of a side, the large quiver, and pieces of the hunter sets.
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

    /**
     * Give every piece of a set the player does not have.
     */
    public static function giveSet(User $user, string $setId): void
    {
        $pieces = config("loot.sets.$setId.pieces", []);
        $granted = array_unique(array_merge($user->granted_pieces ?? [], array_diff($pieces, $user->caughtPieces())));

        $user->forceFill(['granted_pieces' => array_values($granted)])->save();
    }

    /**
     * Take back the pieces of a set that were given. Pieces the player picked up stay.
     */
    public static function takeBackSet(User $user, string $setId): void
    {
        $left = array_diff($user->granted_pieces ?? [], config("loot.sets.$setId.pieces", []));

        $user->forceFill(['granted_pieces' => array_values($left) ?: null])->save();
    }

    /**
     * Everything at once: every boss of both sides beaten, the large quiver, every set.
     */
    public static function everything(User $user): void
    {
        foreach (array_keys(config('boss_loot.bosses')) as $faction) {
            self::beatBosses($user, $faction, count(config("boss_loot.bosses.$faction")));
        }

        foreach (array_keys(config('loot.sets')) as $setId) {
            self::giveSet($user, $setId);
        }

        $user->forceFill(['quiver' => true])->save();
    }
}
