<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'coins' => 'integer',
            'quiver' => 'boolean',
        ];
    }

    /**
     * The games this player has played.
     */
    public function games(): HasMany
    {
        return $this->hasMany(Game::class);
    }

    /**
     * The boss loot this player has collected.
     */
    public function bossDrops(): HasMany
    {
        return $this->hasMany(BossDrop::class);
    }

    /**
     * The pieces of the hunter sets this player has picked up, in any of their games: a piece
     * caught is theirs for good, however that game ended.
     *
     * @return array<int, string>
     */
    public function setPieces(): array
    {
        return GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereIn('item_id', config('loot.items.set_piece'))
            ->whereHas('game', fn ($game) => $game->where('user_id', $this->id))
            ->distinct()
            ->pluck('item_id')
            ->all();
    }

    /**
     * Address of the profile image, or null when the player has not uploaded one.
     */
    public function avatarUrl(): ?string
    {
        return $this->avatar ? asset('storage/'.$this->avatar) : null;
    }
}
