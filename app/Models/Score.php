<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Score extends Model
{
    protected $fillable = [
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
     * The scores on the leaderboard, best first; equal scores rank by who got there first.
     */
    public static function top(): Builder
    {
        return static::query()
            ->orderByDesc('score')
            ->orderBy('created_at')
            ->limit(config('game.leaderboard_size'));
    }

    /**
     * The top scores, in the shape the game's high score screen reads.
     */
    public static function leaderboard(): array
    {
        return static::top()
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
