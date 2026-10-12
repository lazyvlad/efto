<?php

namespace App\Listeners;

use App\Notifications\Welcome;
use Illuminate\Auth\Events\Verified;

/**
 * An account was activated: tell the player what they can now do.
 */
class SendWelcomeEmail
{
    public function handle(Verified $event): void
    {
        $event->user->notify(new Welcome);
    }
}
