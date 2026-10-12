<?php

namespace App\Notifications;

use App\Support\Coins;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent once an account is activated: what the player can now do with what they have earned.
 */
class Welcome extends Notification
{
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your :app account is active', ['app' => config('app.name')]))
            ->markdown('emails.welcome', [
                'name' => $notifiable->name,
                'coins' => Coins::format((int) $notifiable->coins),
                'skipCost' => Coins::format((int) config('boss_loot.skip_cost_per_zone')),
                'rushFee' => Coins::format((int) config('boss_loot.rush.entry_fee')),
                'playUrl' => route('home'),
                'gamesUrl' => route('games.history'),
            ]);
    }
}
