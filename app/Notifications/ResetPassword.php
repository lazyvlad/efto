<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Sent when a player asks to reset their password: the link to choose a new one.
 */
class ResetPassword extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Reset your :app password', ['app' => config('app.name')]))
            ->markdown('emails.reset-password', [
                'name' => $notifiable->name,
                'url' => $this->resetUrl($notifiable),
                'minutes' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
            ]);
    }
}
