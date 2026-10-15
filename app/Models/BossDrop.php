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

    protected $fillable = ['game_id', 'user_id', 'boss_id', 'item_id', 'rarity', 'quiver', 'set_piece', 'bag', 'dropped_at',
        // How the fight went, as the game reported it (null before it was kept)
        'fight_seconds', 'points', 'speed_points', 'par_seconds', 'arrows_used', 'damage_taken', 'hits_taken'];

    protected function casts(): array
    {
        return [
            'quiver' => 'boolean',
            'bag' => 'integer',
            'dropped_at' => 'datetime',
            'fight_seconds' => 'float',
            'points' => 'integer',
            'speed_points' => 'integer',
            'par_seconds' => 'integer',
            'arrows_used' => 'integer',
            'damage_taken' => 'integer',
            'hits_taken' => 'integer',
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
