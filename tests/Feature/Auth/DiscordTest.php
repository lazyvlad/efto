<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DiscordTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.discord.client_id' => 'app-id', 'services.discord.client_secret' => 'app-secret']);
    }

    /**
     * What Discord answers with for the player coming back.
     */
    private function discordSays(array $me = []): void
    {
        Http::fake([
            'discord.com/api/v10/oauth2/token' => Http::response(['access_token' => 'token']),
            'discord.com/api/v10/users/@me' => Http::response($me + [
                'id' => '80351110224678912',
                'username' => 'nelly',
                'global_name' => 'Nelly',
                'email' => 'nelly@example.com',
                'verified' => true,
            ]),
        ]);
    }

    /**
     * Go to Discord and come back approved.
     */
    private function comeBack()
    {
        $this->get('/auth/discord')->assertRedirectContains('https://discord.com/oauth2/authorize');

        return $this->get('/auth/discord/callback?code=abc&state='.session('discord_state'));
    }

    public function test_nothing_about_discord_is_offered_until_it_is_set_up(): void
    {
        config(['services.discord.client_id' => null]);

        $this->get('/login')->assertOk()->assertDontSee('Discord');
        $this->get('/auth/discord')->assertNotFound();
    }

    public function test_the_login_and_register_pages_offer_discord(): void
    {
        $this->get('/login')->assertSee('Log in with Discord');
        $this->get('/register')->assertSee('Register with Discord');
    }

    public function test_a_new_player_gets_an_activated_account(): void
    {
        $this->discordSays();

        $this->comeBack()->assertRedirect(route('home', absolute: false));

        $user = User::sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('Nelly', $user->name);
        $this->assertSame('nelly@example.com', $user->email);
        $this->assertSame('80351110224678912', $user->discord_id);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertTrue($user->canUseRewards());
    }

    public function test_a_returning_player_is_logged_into_the_same_account(): void
    {
        $user = User::factory()->create(['email' => 'other@example.com']);
        $user->forceFill(['discord_id' => '80351110224678912'])->save();
        $this->discordSays();

        $this->comeBack();

        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::count());
    }

    public function test_connecting_discord_activates_an_account_without_the_email(): void
    {
        $user = User::factory()->unverified()->create();
        $this->discordSays(['email' => 'different@example.com']);

        $this->actingAs($user)->get('/verify-email')->assertSee('Activate with Discord');
        $this->comeBack()->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertSame('Nelly', $user->discord_name);
        $this->assertTrue($user->canUseRewards());
        $this->assertFalse($user->hasVerifiedEmail());
    }

    public function test_a_discord_account_belongs_to_one_account_only(): void
    {
        User::factory()->create()->forceFill(['discord_id' => '80351110224678912'])->save();
        $user = User::factory()->unverified()->create();
        $this->discordSays();

        $this->actingAs($user)->get('/auth/discord');
        $this->get('/auth/discord/callback?code=abc&state='.session('discord_state'))
            ->assertSessionHas('discord');

        $this->assertNull($user->fresh()->discord_id);
        $this->assertFalse($user->fresh()->canUseRewards());
    }

    public function test_discord_logs_into_the_account_with_the_same_email(): void
    {
        $user = User::factory()->create(['email' => 'nelly@example.com', 'password' => Hash::make('her-own-password')]);
        $this->discordSays();

        $this->comeBack();

        $this->assertAuthenticatedAs($user);
        $this->assertTrue(Hash::check('her-own-password', $user->fresh()->password));
    }

    public function test_an_unproven_account_with_the_same_email_loses_its_password(): void
    {
        // Someone registered with an address that is not theirs, hoping its owner turns up
        $user = User::factory()->unverified()->create(['email' => 'nelly@example.com', 'password' => Hash::make('planted')]);
        $this->discordSays();

        $this->comeBack();

        $this->assertAuthenticatedAs($user);
        $this->assertFalse(Hash::check('planted', $user->fresh()->password));
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_an_email_discord_has_not_verified_is_not_trusted(): void
    {
        User::factory()->create(['email' => 'nelly@example.com']);
        $this->discordSays(['verified' => false]);

        $this->comeBack()->assertRedirect(route('register'));

        $this->assertGuest();
        $this->assertSame(1, User::count());
    }

    public function test_an_answer_nobody_asked_for_is_refused(): void
    {
        $this->discordSays();

        $this->get('/auth/discord');
        $this->get('/auth/discord/callback?code=abc&state=made-up')->assertRedirect(route('login'));
        $this->get('/auth/discord/callback?error=access_denied')->assertRedirect(route('login'));

        $this->assertGuest();
        Http::assertNothingSent();
    }
}
