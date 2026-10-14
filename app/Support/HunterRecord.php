<?php

namespace App\Support;

use App\Models\BossDrop;
use App\Models\GameDrop;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * What one of a player's two hunters has done: his games, the rare items and boss loot he
 * found, and his record against each boss of his side. My Games and the game's own
 * collection screen show it, one hunter at a time.
 */
class HunterRecord
{
    /** The hunter to show first: the one played last (the Alliance hunter for none) */
    public static function lastPlayed(User $user): string
    {
        $faction = $user->games()->whereNotNull('faction')->latest('started_at')->value('faction');

        return in_array($faction, Gear::SIDES, true) ? $faction : 'alliance';
    }

    /**
     * His games that count: how many, the best score, and the time played.
     *
     * @return array{played: int, best: int, seconds: int}
     */
    public static function stats(User $user, string $side): array
    {
        $legal = Gear::onSide($user->games()->legal(), $side);

        return [
            'played' => (clone $legal)->count(),
            'best' => (int) (clone $legal)->max('score'),
            'seconds' => (int) (clone $legal)->sum('game_time'),
        ];
    }

    /**
     * How often he found each rare item. Only games that count add to the collection.
     *
     * @return Collection<string, int>
     */
    public static function rareItemsFound(User $user, string $side): Collection
    {
        return GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereHas('game', fn ($game) => Gear::onSide($game->legal()->where('user_id', $user->id), $side))
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');
    }

    /**
     * How often he found each piece of his side's boss loot (his whichever way the game ended).
     *
     * @return Collection<string, int>
     */
    public static function bossLootFound(User $user, string $side): Collection
    {
        return self::kills($user, $side)
            ->selectRaw('item_id, count(*) as times')
            ->groupBy('item_id')
            ->pluck('times', 'item_id');
    }

    /**
     * His record against each boss of his side, in the order they are met: how many times he
     * brought it down, and his best fight by each measure. A measure is null when no fight
     * with it was recorded (kills from before fights were kept).
     *
     * @return array<string, array{kills: int, fastest: ?float, par: ?int, mostPoints: ?int, fewestArrows: ?int, leastDamage: ?int, lastKill: ?\Illuminate\Support\Carbon}>
     */
    public static function bossRecords(User $user, string $side): array
    {
        $rows = self::kills($user, $side)
            // Kills an admin gave are not fights
            ->where('granted', false)
            ->selectRaw('boss_id, count(*) as kills, min(fight_seconds) as fastest, max(par_seconds) as par,
                max(points + speed_points) as most_points, min(arrows_used) as fewest_arrows,
                min(damage_taken) as least_damage, max(dropped_at) as last_kill')
            ->groupBy('boss_id')
            ->get()
            ->keyBy('boss_id');

        $records = [];
        foreach (array_keys(config("boss_loot.bosses.$side", [])) as $bossId) {
            $row = $rows[$bossId] ?? null;
            $records[$bossId] = [
                'kills' => (int) ($row->kills ?? 0),
                'fastest' => $row?->fastest !== null ? (float) $row->fastest : null,
                'par' => $row?->par !== null ? (int) $row->par : null,
                'mostPoints' => $row?->most_points !== null ? (int) $row->most_points : null,
                'fewestArrows' => $row?->fewest_arrows !== null ? (int) $row->fewest_arrows : null,
                'leastDamage' => $row?->least_damage !== null ? (int) $row->least_damage : null,
                'lastKill' => $row?->last_kill ? \Illuminate\Support\Carbon::parse($row->last_kill) : null,
            ];
        }

        return $records;
    }

    /** The boss kills of a side's hunter: his side's bosses are his alone */
    private static function kills(User $user, string $side)
    {
        return BossDrop::query()
            ->where('user_id', $user->id)
            ->whereIn('boss_id', array_keys(config("boss_loot.bosses.$side", [])));
    }
}
