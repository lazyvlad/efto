<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Score extends Model
{
    protected $fillable = [
        'game_id',
        'user_id',
        'name',
        'score',
        'level',
        'game_time',
        'dragonstalker_completions',
        'final_crit_rating',
        'final_dodge_rating',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'level' => 'integer',
            'game_time' => 'integer',
            'dragonstalker_completions' => 'integer',
            'final_crit_rating' => 'float',
            'final_dodge_rating' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The game this score came from; none for scores from before games were recorded.
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * The scores on the leaderboard: the latest version of the game first, and within a
     * version the best first; equal scores rank by who got there first. Scores from before
     * games kept their version come last.
     */
    public static function top(): Builder
    {
        return static::ranked()->limit(config('game.leaderboard_size'));
    }

    /** Every score, in the leaderboard's order */
    private static function ranked(): Builder
    {
        return static::query()
            ->select('scores.*')
            ->leftJoin('games', 'games.id', '=', 'scores.game_id')
            ->orderByRaw('coalesce(games.version_rank, 0) desc')
            ->orderByDesc('scores.score')
            ->orderBy('scores.created_at');
    }

    /**
     * Where a score made in a version of the game stands among that version's (1 is the
     * best): the leaderboard is grouped by version, each ranked on its own.
     */
    public static function rankOf(int $score, ?int $versionRank): int
    {
        return static::query()
            ->leftJoin('games', 'games.id', '=', 'scores.game_id')
            ->whereRaw('coalesce(games.version_rank, 0) = ?', [$versionRank ?? 0])
            ->where('scores.score', '>', $score)
            ->count() + 1;
    }

    /**
     * The top scores, in the shape the game's high score screen reads.
     */
    public static function leaderboard(): array
    {
        return static::top()
            ->with('game')
            ->get()
            ->map(fn (Score $score) => [
                'name' => $score->name,
                'score' => $score->score,
                'level' => $score->level,
                'gameTime' => $score->game_time,
                'dragonstalkerCompletions' => $score->dragonstalker_completions,
                'finalCritRating' => $score->final_crit_rating,
                'finalDodgeRating' => $score->final_dodge_rating,
                'timestamp' => $score->created_at?->toIso8601String(),
                'registered' => $score->user_id !== null,
                // How the score was made: the version of the game, and the gear worn
                'version' => $score->game?->game_version,
                // The side the hunter played for (null before there were sides)
                'faction' => $score->game?->faction,
                'gear' => $score->game?->gearLabel(),
                'gearStats' => $score->game?->gear,
            ])
            ->all();
    }

    /**
     * Player-supplied names: no markup or control characters, single spaces, 20 characters.
     */
    public static function cleanName(?string $name): string
    {
        $name = strip_tags((string) $name);
        $name = preg_replace('/[\x00-\x1F\x7F<>]/u', '', $name) ?? '';
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? '');

        return mb_substr($name, 0, 20);
    }
}
