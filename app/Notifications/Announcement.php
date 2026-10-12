<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * A general message to players: news, a new version, an event. The body is Markdown. Sent
 * with "php artisan input:announce"; every copy carries a link to stop receiving them.
 */
class Announcement extends Notification
{
    public function __construct(
        public string $subject,
        public string $body,
        public ?string $buttonText = null,
        public ?string $buttonUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject($this->subject)
            ->markdown('emails.announcement', [
                'name' => $notifiable->name,
                'subject' => $this->subject,
                'body' => $this->body,
                'buttonText' => $this->buttonText,
                'buttonUrl' => $this->buttonUrl ?? route('home'),
                'unsubscribeUrl' => URL::signedRoute('news.unsubscribe', ['user' => $notifiable->getKey()]),
            ]);
    }
}
