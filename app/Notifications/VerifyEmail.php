<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;

/**
 * Sent when an account is registered (and again on request): the link that activates it.
 * Until it is followed the player can play and earn, but not use their coins and loot.
 */
class VerifyEmail extends BaseVerifyEmail
{
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Activate your :app account', ['app' => config('app.name')]))
            ->markdown('emails.verify', [
                'name' => $notifiable->name,
                'url' => $this->verificationUrl($notifiable),
                'minutes' => (int) Config::get('auth.verification.expire', 60),
            ]);
    }
}
