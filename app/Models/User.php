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
            'carried' => 'array',
            'outfits' => 'array',
            'bag_contents' => 'array',
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
     * The pieces of the hunter sets a side's hunter has: picked up in any of his side's games
     * (a piece caught is his for good, however that game ended; each hunter has his own), or
     * given by an admin (to both). With no side, both hunters' together.
     *
     * @return array<int, string>
     */
    public function setPieces(?string $side = null): array
    {
        return array_values(array_unique(array_merge($this->caughtPieces($side), $this->granted_pieces ?? [])));
    }

    /**
     * The set pieces a side's hunter picked up himself (with no side, either did).
     *
     * @return array<int, string>
     */
    public function caughtPieces(?string $side = null): array
    {
        return GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereIn('item_id', config('loot.items.set_piece'))
            ->whereHas('game', function ($game) use ($side) {
                $game->where('user_id', $this->id);
                if ($side !== null) {
                    \App\Support\Gear::onSide($game, $side);
                }
            })
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
