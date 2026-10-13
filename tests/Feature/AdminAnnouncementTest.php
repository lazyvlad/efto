<?php

namespace Tests\Feature;

use App\Models\SentAnnouncement;
use App\Models\User;
use App\Notifications\Announcement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AdminAnnouncementTest extends TestCase
{
    use RefreshDatabase;

    private const MESSAGE = ['subject' => 'Patch day', 'body' => 'The **pets** are here.'];

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    public function test_the_page_is_for_admins_and_says_who_would_receive_it(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.announcements.index'))->assertNotFound();
        $this->actingAs(User::factory()->create())->post(route('admin.announcements.send'), self::MESSAGE + ['to' => 'everyone'])->assertNotFound();

        // With the two players above and the admin, that makes three
        $this->actingAs($this->admin())->get(route('admin.announcements.index'))
            ->assertOk()
            ->assertSee('It goes to 3 players')
            ->assertSee('Nothing has been sent from here yet.');
    }

    public function test_it_can_be_sent_to_the_admin_alone_first(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $player = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.announcements.send'), self::MESSAGE + ['to' => 'me'])
            ->assertSessionHas('status')
            ->assertSessionHasInput('subject', 'Patch day');

        Notification::assertSentTo($admin, Announcement::class);
        Notification::assertNotSentTo($player, Announcement::class);
        $this->assertSame(0, SentAnnouncement::count());
    }

    public function test_everyone_means_players_who_can_and_want_to_be_written_to(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $player = User::factory()->create();
        $unconfirmed = User::factory()->unverified()->create();
        $noNews = User::factory()->create();
        $noNews->forceFill(['news_emails' => false])->save();
        $blocked = User::factory()->create();
        $blocked->forceFill(['blocked_at' => now()])->save();

        $this->actingAs($admin)->post(route('admin.announcements.send'), self::MESSAGE + [
            'to' => 'everyone', 'button_text' => 'Play', 'button_url' => 'https://example.com/play',
        ])->assertRedirect(route('admin.announcements.index'))->assertSessionHas('status', 'Sent to 2 players.');

        Notification::assertSentTo([$admin, $player], Announcement::class, fn (Announcement $sent) => $sent->subject === 'Patch day'
            && $sent->buttonUrl === 'https://example.com/play');
        Notification::assertNotSentTo([$unconfirmed, $noNews, $blocked], Announcement::class);

        $this->assertDatabaseHas('announcements', ['subject' => 'Patch day', 'sent_to' => 2, 'failed' => 0, 'user_id' => $admin->id]);
        $this->actingAs($admin)->get(route('admin.announcements.index'))->assertSee('Patch day')->assertSee('The **pets** are here.');
    }

    public function test_a_message_needs_a_subject_a_body_and_a_real_link(): void
    {
        Notification::fake();

        $this->actingAs($this->admin())->post(route('admin.announcements.send'), ['to' => 'everyone', 'button_url' => 'javascript:alert(1)'])
            ->assertSessionHasErrors(['subject', 'body', 'button_url']);

        Notification::assertNothingSent();
    }

    public function test_the_email_itself_renders(): void
    {
        $admin = $this->admin();

        $html = (string) (new Announcement('Patch day', 'The **pets** are here.', 'Play'))->toMail($admin)->render();

        $this->assertStringContainsString('pets</strong>', $html);
        $this->assertStringContainsString('Patch day', $html);
    }
}
