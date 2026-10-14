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

    public const NORMAL = 'normal';

    public const BOSS_RUSH = 'boss_rush';

    // One boss and nothing else: the boss of the zone the game starts in
    public const BOSS_FIGHT = 'boss_fight';

    protected $fillable = [
        'token',
        'user_id',
        'name',
        'faction',
        'start_zone',
        'mode',
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
        'gear',
        'materials',
        'coins',
        'game_version',
        'started_at',
        'ended_at',
    ];

    /**
     * A version as a number that sorts as versions do: "3.0.6" is 3000006, "2.43.0" 2043000.
     * Null for none, or for one that is not a version.
     */
    public static function versionRank(?string $version): ?int
    {
        if ($version === null || ! preg_match('/^(\d{1,3})\.(\d{1,3})(?:\.(\d{1,3}))?/', $version, $parts)) {
            return null;
        }

        return (int) $parts[1] * 1_000_000 + (int) $parts[2] * 1_000 + (int) ($parts[3] ?? 0);
    }

    protected static function booted(): void
    {
        // Kept with the version, for the high scores' order (Score::top)
        static::saving(function (Game $game) {
            if ($game->isDirty('game_version') || $game->version_rank === null) {
                $game->version_rank = self::versionRank($game->game_version);
            }
        });
    }

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
            'gear' => 'array',
            'materials' => 'array',
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

    /**
     * The gear the game was played in, in a few words ("Cryptstalker 9/9"), or null when the
     * hunter wore nothing that gave anything.
     */
    public function gearLabel(): ?string
    {
        $set = config('loot.sets.'.($this->gear['set'] ?? ''));

        if (! $set || ($this->gear['pieces'] ?? 0) < 1) {
            return null;
        }

        return strtok($set['name'], ' ').' '.$this->gear['pieces'].'/'.count($set['pieces']);
    }

    public function isBossRush(): bool
    {
        return $this->mode === self::BOSS_RUSH;
    }

    public function isBossFight(): bool
    {
        return $this->mode === self::BOSS_FIGHT;
    }

    /**
     * A game of nothing but bosses: they come at once, with no zone to play through first.
     */
    public function isOnlyBosses(): bool
    {
        return $this->isBossRush() || $this->isBossFight();
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
