<?php

namespace App\Models;

use App\Notifications\ResetPassword;
use App\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * A player's account. It works from the moment it is registered: the player can log in, play
 * and earn. Until they activate it, through the link emailed to them (MustVerifyEmail) or by
 * connecting their Discord account, they cannot use what they earn: see canUseRewards().
 */
class User extends Authenticatable implements MustVerifyEmail
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
            'news_emails' => 'boolean',
            'granted_pieces' => 'array',
            'equipment' => 'array',
            'bags' => 'array',
            'materials' => 'array',
            'sold' => 'array',
            'is_admin' => 'boolean',
            'blocked_at' => 'datetime',
        ];
    }

    /**
     * Whether the player may use what they have earned: spend coins, wear their sets, carry
     * the large quiver. Earning needs no activation; using does.
     */
    public function canUseRewards(): bool
    {
        return $this->hasVerifiedEmail() || $this->discord_id !== null;
    }

    /**
     * Shut out of the site by an admin: cannot log in, and is logged out where it is.
     */
    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    /**
     * The activation email, in the game's own words and look.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmail);
    }

    /**
     * The password reset email, in the game's own words and look.
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPassword($token));
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
     * The pieces of the hunter sets this player has: picked up in any of their games (a piece
     * caught is theirs for good, however that game ended) or given to them by an admin.
     *
     * @return array<int, string>
     */
    public function setPieces(): array
    {
        return array_values(array_unique(array_merge($this->caughtPieces(), $this->granted_pieces ?? [])));
    }

    /**
     * The set pieces the player picked up themselves, in any of their games.
     *
     * @return array<int, string>
     */
    public function caughtPieces(): array
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
