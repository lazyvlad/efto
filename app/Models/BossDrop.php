<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The item a defeated boss dropped in one game. With a user_id it is part of that player's
 * boss loot.
 */
class BossDrop extends Model
{
    public $timestamps = false;

    protected $fillable = ['game_id', 'user_id', 'boss_id', 'item_id', 'rarity', 'quiver', 'dropped_at'];

    protected function casts(): array
    {
        return [
            'quiver' => 'boolean',
            'dropped_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
