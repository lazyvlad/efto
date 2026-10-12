<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Notifications\Announcement;
use App\Notifications\ResetPassword;
use App\Notifications\VerifyEmail;
use App\Notifications\Welcome;
use App\Support\BossLoot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AccountEmailsTest extends TestCase
{
    use RefreshDatabase;

    public function test_registering_sends_the_activation_email_and_logs_the_player_in(): void
    {
        Notification::fake();

        $this->post('/register', [
            'name' => 'Rexxar',
            'email' => 'rexxar@example.com',
            'password' => 'a long enough password',
            'password_confirmation' => 'a long enough password',
        ])->assertRedirect(route('home', absolute: false));

        $user = User::where('email', 'rexxar@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertFalse($user->canUseRewards());
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_following_the_link_activates_the_account_and_sends_the_welcome(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->actingAs($user)->get($url)->assertRedirect(route('home', absolute: false).'?verified=1');

        $this->assertTrue($user->fresh()->canUseRewards());
        Notification::assertSentTo($user, Welcome::class);
    }

    public function test_an_account_that_is_not_activated_earns_but_cannot_use_what_it_has(): void
    {
        config(['boss_loot.quiver.chance' => 1]);
        $user = User::factory()->unverified()->create();
        $user->forceFill(['coins' => 20000])->save();
        foreach (['garrick-padfoot', 'hogger'] as $bossId) {
            $boss = BossLoot::boss($bossId);
            $user->bossDrops()->create(['boss_id' => $bossId, 'item_id' => $boss['loot']['uncommon']['id'], 'rarity' => 'uncommon', 'dropped_at' => now()]);
        }

        // Spending is refused, and nothing is taken
        $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 2])->assertStatus(422);
        $this->postJson(route('games.open'), ['faction' => 'alliance', 'mode' => 'boss_rush'])->assertStatus(422);
        $this->assertSame(20000, $user->fresh()->coins);

        // Playing and earning go on: a boss drops its loot and the quiver, a set piece is kept, coins are banked
        $token = $this->postJson(route('games.open'), ['faction' => 'alliance'])->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $piece = $game->drops()->create(['item_id' => 'giantstalker-helmet', 'chunk' => 0, 'at_seconds' => 3]);
        $this->travel(60)->seconds();
        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk()->assertJsonPath('kept', true);
        $this->postJson(route('games.finish', $game), ['score' => 10, 'gameTime' => 50, 'pickups' => [$piece->id], 'items' => ['ring1' => 2]])
            ->assertOk()
            ->assertJsonPath('coins.balance', 20320);
        $this->assertTrue($user->fresh()->quiver);
        $this->assertSame(['giantstalker-helmet'], $user->fresh()->setPieces());

        // ...but the game is not handed any of it to use
        $html = $this->actingAs($user->fresh())->get(route('play'))->getContent();
        $this->assertStringContainsString('"verified":false,"quiver":false,"pieces":[]', $html);
        $this->assertStringContainsString('"skip":null,"rush":null', $html);
        $this->get(route('games.history'))->assertSee('Your account is not activated yet.');

        // Activated, it all counts
        $user->markEmailAsVerified();
        $html = $this->actingAs($user->fresh())->get(route('play'))->getContent();
        $this->assertStringContainsString('"verified":true,"quiver":true,"pieces":["giantstalker-helmet"]', $html);
        $this->assertStringContainsString('"rush":{"fee":5000}', $html);
        $this->get(route('games.history'))->assertDontSee('Your account is not activated yet.');
        $this->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 2])->assertOk();
    }

    public function test_the_emails_read_as_the_game_and_carry_their_links(): void
    {
        $user = User::factory()->create(['name' => 'Rexxar']);
        $user->forceFill(['coins' => 32005])->save();

        $verify = (new VerifyEmail)->toMail($user);
        $this->assertSame('Activate your '.config('app.name').' account', $verify->subject);
        $html = (string) $verify->render();
        $this->assertStringContainsString('Welcome, Rexxar', $html);
        $this->assertStringContainsString('Activate my account', $html);
        $this->assertStringContainsString('verify-email/'.$user->id, $html);

        $reset = (string) (new ResetPassword('the-token'))->toMail($user)->render();
        $this->assertStringContainsString('Choose a new password', $reset);
        $this->assertStringContainsString('reset-password/the-token', $reset);

        $welcome = (string) (new Welcome)->toMail($user)->render();
        $this->assertStringContainsString('Your purse: 3g 20s 5c', $welcome);

        $news = (string) (new Announcement('Version 3 is out', "New **raids** this week.", 'Play now'))->toMail($user)->render();
        $this->assertStringContainsString('Version 3 is out', $news);
        // The body is Markdown (the tag comes out with the theme's styles written into it)
        $this->assertMatchesRegularExpression('/<strong[^>]*>raids<\/strong>/', $news);
        $this->assertStringContainsString('Play now', $news);
        $this->assertStringContainsString('news/unsubscribe/'.$user->id, $news);
    }

    public function test_news_goes_to_activated_players_who_want_it_and_the_link_stops_it(): void
    {
        Notification::fake();
        $wants = User::factory()->create();
        $inactive = User::factory()->unverified()->create();
        $optedOut = User::factory()->create();
        $optedOut->forceFill(['news_emails' => false])->save();

        $this->artisan('input:announce', ['subject' => 'Hello', '--body' => 'Something new.', '--force' => true])
            ->expectsOutput('Sent to 1 players.')
            ->assertSuccessful();

        Notification::assertSentTo($wants, Announcement::class);
        Notification::assertNotSentTo($inactive, Announcement::class);
        Notification::assertNotSentTo($optedOut, Announcement::class);

        // The link in the footer works without logging in, and only when it is the signed one
        $this->get(route('news.unsubscribe', ['user' => $wants->id]))->assertForbidden();
        $this->get(URL::signedRoute('news.unsubscribe', ['user' => $wants->id]))->assertOk()->assertSee('no more news');
        $this->assertFalse($wants->fresh()->news_emails);

        $this->artisan('input:announce', ['subject' => 'Hello', '--body' => 'Again.', '--to' => $inactive->email])
            ->expectsOutput("Sent to {$inactive->email}.");
        $this->artisan('input:announce', ['subject' => 'Hello'])->assertFailed();
    }

    public function test_the_profile_keeps_the_news_choice_and_a_new_address_must_be_confirmed(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->patch('/profile', ['name' => $user->name, 'email' => $user->email])->assertSessionHasNoErrors();
        $this->assertFalse($user->fresh()->news_emails);
        $this->assertTrue($user->fresh()->canUseRewards());

        $this->patch('/profile', ['name' => $user->name, 'email' => 'new@example.com', 'news_emails' => '1'])->assertSessionHasNoErrors();
        $this->assertTrue($user->fresh()->news_emails);
        $this->assertFalse($user->fresh()->canUseRewards());
        Notification::assertSentTo($user, VerifyEmail::class);
    }
}
