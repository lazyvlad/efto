<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SentAnnouncement;
use App\Models\User;
use App\Notifications\Announcement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\View\View;
use Throwable;

/**
 * Write a general message to players and send it: to yourself first to see it, then to all.
 */
class AnnouncementController extends Controller
{
    public function index(): View
    {
        return view('admin.announcements', [
            'recipients' => $this->recipients()->count(),
            'sent' => SentAnnouncement::with('user')->latest()->limit(20)->get(),
        ]);
    }

    public function send(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:10000'],
            'button_text' => ['nullable', 'string', 'max:60'],
            'button_url' => ['nullable', 'url:http,https', 'max:255'],
            'to' => ['required', 'in:me,everyone'],
        ]);

        $announcement = new Announcement(
            $data['subject'],
            trim($data['body']),
            $data['button_text'] ?? null,
            $data['button_url'] ?? null,
        );

        if ($data['to'] === 'me') {
            $request->user()->notify($announcement);

            // The form comes back as it was, ready to go to everyone
            return back()->withInput()->with('status', __('Sent to you only, at :email. If it reads well, send it to everyone.', [
                'email' => $request->user()->email,
            ]));
        }

        $sent = $failed = 0;

        // One address that will not take mail must not stop the rest
        $this->recipients()->each(function (User $user) use ($announcement, &$sent, &$failed) {
            try {
                $user->notify($announcement);
                $sent++;
            } catch (Throwable $e) {
                $failed++;
                Log::warning("Announcement not sent to user {$user->id}: ".$e->getMessage());
            }
        });

        SentAnnouncement::create([
            'user_id' => $request->user()->id,
            'subject' => $data['subject'],
            'body' => trim($data['body']),
            'button_text' => $data['button_text'] ?? null,
            'button_url' => $data['button_url'] ?? null,
            'sent_to' => $sent,
            'failed' => $failed,
        ]);

        return redirect()->route('admin.announcements.index')->with('status', $failed
            ? __('Sent to :sent players; :failed could not be sent.', ['sent' => $sent, 'failed' => $failed])
            : __('Sent to :sent players.', ['sent' => $sent]));
    }

    /**
     * Players who confirmed their email address, have not turned news off and are not blocked.
     */
    private function recipients(): Builder
    {
        return User::query()->where('is_guest', false)
            ->whereNotNull('email_verified_at')
            ->whereNull('blocked_at')
            ->where('news_emails', true);
    }
}
