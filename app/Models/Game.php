<?php

namespace App\Models;

use App\Support\LootTable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Collection;

/**
 * One game played. The server opens it when the game starts and hands out its rare loot.
 */
class Game extends Model
{
    public const OPEN = 'open';

    public const FINISHED = 'finished';

    public const ABANDONED = 'abandoned';

    protected $fillable = [
        'token',
        'user_id',
        'name',
        'faction',
        'start_zone',
        'status',
        'offline',
        'chunks_issued',
        'score',
        'level',
        'game_time',
        'dragonstalker_completions',
        'final_crit_rating',
        'final_dodge_rating',
        'items',
        'coins',
        'game_version',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'start_zone' => 'integer',
            'offline' => 'boolean',
            'chunks_issued' => 'integer',
            'score' => 'integer',
            'level' => 'integer',
            'game_time' => 'integer',
            'dragonstalker_completions' => 'integer',
            'final_crit_rating' => 'float',
            'final_dodge_rating' => 'float',
            'items' => 'array',
            'coins' => 'integer',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'token';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function drops(): HasMany
    {
        return $this->hasMany(GameDrop::class);
    }

    /**
     * What the bosses defeated in this game dropped.
     */
    public function bossDrops(): HasMany
    {
        return $this->hasMany(BossDrop::class);
    }

    public function scoreEntry(): HasOne
    {
        return $this->hasOne(Score::class);
    }

    /**
     * Games that count: played to the end with the server deciding the loot throughout.
     */
    public function scopeLegal(Builder $query): Builder
    {
        return $query->where('status', self::FINISHED)->where('offline', false);
    }

    /**
     * The rare items picked up in this game.
     */
    public function pickups(): HasMany
    {
        return $this->drops()->whereNotNull('claimed_at')->orderBy('at_seconds');
    }

    public function isOpen(): bool
    {
        return $this->status === self::OPEN;
    }

    public function isLegal(): bool
    {
        return $this->status === self::FINISHED && ! $this->offline;
    }

    /**
     * The level the game started at: the first of its starting zone.
     */
    public function startLevel(): int
    {
        return (max(1, (int) $this->start_zone) - 1) * (int) config('boss_loot.levels_per_zone') + 1;
    }

    /**
     * Real seconds since the game started. Play time can only be shorter (pauses).
     */
    public function secondsSinceStart(): int
    {
        return (int) $this->started_at->diffInSeconds(now(), true);
    }

    /**
     * The drops for a chunk of play, rolling them the first time the chunk is asked for.
     * Chunks are handed out in order.
     *
     * @return Collection<int, GameDrop>
     */
    public function dropsForChunk(int $chunk): Collection
    {
        if ($chunk < $this->chunks_issued) {
            return $this->drops()->where('chunk', $chunk)->orderBy('at_seconds')->get();
        }

        $offered = $this->drops()->pluck('item_id')->all();

        $drops = collect(LootTable::rollChunk($chunk, $offered, $this->startLevel()))
            ->map(fn (array $drop) => $this->drops()->create($drop + ['chunk' => $chunk]));

        $this->update(['chunks_issued' => $chunk + 1]);

        return $drops;
    }

    /**
     * Mark drops as picked up. Only this game's own unclaimed drops whose time has come
     * count; anything else is ignored.
     *
     * @param  array<int, int>  $dropIds
     */
    public function claim(array $dropIds): void
    {
        if ($dropIds === []) {
            return;
        }

        $this->drops()
            ->whereIn('id', $dropIds)
            ->whereNull('claimed_at')
            ->where('at_seconds', '<=', $this->secondsSinceStart() + 5)
            ->update(['claimed_at' => now()]);
    }
}
