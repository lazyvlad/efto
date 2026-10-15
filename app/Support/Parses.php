<?php

namespace App\Support;

use App\Models\BossDrop;

/**
 * Parses, as the WoW log sites have them: how a boss kill stands against every other kill of
 * that boss in the same version of the game, as a percentile. Kills are ranked by how long the
 * fight took (in a version a boss has the same health for everyone, so the fastest kill is
 * also the most damage a second); a kill's parse is the share of the other kills it beat:
 * 100 for the fastest, 0 for the slowest, and kills just as fast share theirs. A boss killed
 * only once in a version: 100.
 *
 * Only kills that were fought and timed count: not one an admin gave, nor one from before
 * fights were timed. Worked out when asked, so a parse moves as others play.
 */
class Parses
{
    /** @var array<string, array<int, float>> Fight times of a boss in a version, fastest first */
    private static array $times = [];

    /**
     * The parse of each kill that has one, by its id. The kills need their game (for its version).
     *
     * @param  iterable<BossDrop>  $kills
     * @return array<int, int>
     */
    public static function of(iterable $kills): array
    {
        $parses = [];
        foreach ($kills as $kill) {
            $parse = self::parse($kill);
            if ($parse !== null) {
                $parses[$kill->id] = $parse;
            }
        }

        return $parses;
    }

    /** One kill's parse, or null for a kill that does not count (untimed, given, no version) */
    public static function parse(BossDrop $kill): ?int
    {
        $version = $kill->game?->version_rank;
        if ($kill->fight_seconds === null || $kill->granted || $version === null) {
            return null;
        }

        return self::percentile((float) $kill->fight_seconds, self::times($kill->boss_id, $version));
    }

    /**
     * Where a fight time stands among these (fastest first): the share of them it beat.
     *
     * @param  array<int, float>  $times  Every kill's time, its own among them
     */
    public static function percentile(float $seconds, array $times): int
    {
        $others = count($times) - 1;
        if ($others < 1) {
            return 100;
        }
        // The kills slower than this one
        $beaten = count(array_filter($times, fn (float $time) => $time > $seconds));

        return (int) floor(100 * $beaten / $others);
    }

    /**
     * The colour of a parse, as the log sites have it: grey, green, blue, purple, orange, pink,
     * and gold for the very best.
     */
    public static function color(int $parse): string
    {
        return match (true) {
            $parse >= 100 => '#e5cc80',
            $parse >= 99 => '#e268a8',
            $parse >= 95 => '#ff8000',
            $parse >= 75 => '#a335ee',
            $parse >= 50 => '#0070ff',
            $parse >= 25 => '#1eff00',
            default => '#9d9d9d',
        };
    }

    /** @return array<int, float> */
    private static function times(string $bossId, int $version): array
    {
        $key = $bossId.'@'.$version;
        if (! isset(self::$times[$key]) || app()->runningUnitTests()) {
            self::$times[$key] = BossDrop::query()
                ->join('games', 'games.id', '=', 'boss_drops.game_id')
                ->where('boss_drops.boss_id', $bossId)
                ->where('games.version_rank', $version)
                ->where('boss_drops.granted', false)
                ->whereNotNull('boss_drops.fight_seconds')
                ->orderBy('boss_drops.fight_seconds')
                ->pluck('boss_drops.fight_seconds')
                ->map(fn ($seconds) => (float) $seconds)
                ->all();
        }

        return self::$times[$key];
    }

    /** Forget what was worked out (a new kill came in during this request) */
    public static function forget(): void
    {
        self::$times = [];
    }
}
