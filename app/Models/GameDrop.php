<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A rare item the server offered a game; claimed_at is set once the player picked it up.
 */
class GameDrop extends Model
{
    public $timestamps = false;

    protected $fillable = ['game_id', 'item_id', 'chunk', 'at_seconds', 'claimed_at'];

    protected function casts(): array
    {
        return [
            'chunk' => 'integer',
            'at_seconds' => 'integer',
            'claimed_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * The shape the game reads.
     */
    public function forGame(): array
    {
        return ['id' => $this->id, 'item' => $this->item_id, 'at' => $this->at_seconds];
    }
}
