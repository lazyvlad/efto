<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A few seconds of debug mode's measurements from a player's browser (the game's perfProbe).
 */
class PerfSample extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'session', 'game_version', 'device', 'sample'];

    protected function casts(): array
    {
        return ['device' => 'array', 'sample' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
