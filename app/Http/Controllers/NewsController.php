<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\Announcement;
use App\Notifications\ResetPassword;
use App\Notifications\VerifyEmail;
use App\Notifications\Welcome;
use Illuminate\Http\Request;
use Illuminate\Support\HtmlString;
use Illuminate\View\View;

class NewsController extends Controller
{
    /**
     * Stop the general emails for a player (the link in their footer).
     */
    public function unsubscribe(User $user): View
    {
        $user->forceFill(['news_emails' => false])->save();

        return view('news.unsubscribed');
    }

    /**
     * Development only: an email as it will be sent, for the logged-in player or a stand-in.
     */
    public function preview(Request $request, ?string $email = null): HtmlString|View
    {
        $user = $request->user() ?? new User(['name' => 'Rexxar', 'email' => 'rexxar@example.com']);
        if (! $user->exists) {
            $user->id = 1;
        }

        $emails = [
            'verify' => fn () => new VerifyEmail,
            'reset-password' => fn () => new ResetPassword('preview-token'),
            'welcome' => fn () => new Welcome,
            'announcement' => fn () => new Announcement(
                'Version 2.23 is out',
                "The three hunter sets are now kept on your account, and you choose which one to wear.\n\n- **Giantstalker** for dodge\n- **Dragonstalker** for crit\n- **Cryptstalker** for damage to bosses\n\nBeating the tenth boss now wins the game.",
                'Play now',
            ),
        ];

        if (! isset($emails[$email])) {
            return view('news.preview-index', ['emails' => array_keys($emails)]);
        }

        return $emails[$email]()->toMail($user)->render();
    }
}
