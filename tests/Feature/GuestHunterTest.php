<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use App\Support\Bags;
use App\Support\GuestHunter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A guest keeps what he finds on a guest account, known by a key in his browser, and brings it
 * along when he signs up or logs in (App\Support\GuestHunter).
 */
class GuestHunterTest extends TestCase
{
    use RefreshDatabase;

    private function boot(string $html): array
    {
        preg_match('/window\.INPUT_BOOT = (.*?);<\/script>/s', $html, $match);

        return json_decode($match[1], true);
    }

    /** A guest's first visit: his key, and his account */
    private function newGuest(): array
    {
        // A browser of his own
        $this->defaultCookies = [];
        $response = $this->get(route('play'))->assertOk();
        $key = $response->getCookie(GuestHunter::COOKIE)->getValue();
        $this->flushSession();

        return [$key, User::where('is_guest', true)->latest('id')->firstOrFail()];
    }

    private function playAndBeatHogger(string $key): array
    {
        $token = $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)
            ->postJson(route('games.open'), ['faction' => 'alliance', 'name' => 'Kestrel'])->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $this->travel(120)->seconds();

        return $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)
            ->postJson(route('games.boss', $game), ['boss' => 'hogger'])->assertOk()->json();
    }

    public function test_a_guest_keeps_what_a_boss_drops_and_plays_under_the_name_he_typed(): void
    {
        [$key, $guest] = $this->newGuest();
        $drop = $this->playAndBeatHogger($key);

        $this->assertTrue($drop['kept']);
        $this->assertSame(1, $guest->bossDrops()->count());
        $this->assertSame('Kestrel', $guest->fresh()->name);
        $this->assertSame($guest->id, Game::latest('id')->first()->user_id);
    }

    public function test_coming_back_he_is_told_once_what_he_is_continuing_with(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);

        $boot = $this->boot($this->withCookie(GuestHunter::COOKIE, $key)->get(route('play'))->getContent());
        $this->assertTrue($boot['user']['guest']);
        $this->assertSame('Kestrel', $boot['user']['name']);
        $this->assertSame(1, $boot['welcomeBack']['hunters']['alliance']['bosses']);
        $this->assertArrayNotHasKey('horde', $boot['welcomeBack']['hunters']);
        $this->assertContains('hogger', $boot['user']['bosses']);

        // Once a visit
        $again = $this->boot($this->withCookie(GuestHunter::COOKIE, $key)->get(route('play'))->getContent());
        $this->assertNull($again['welcomeBack']);
        $this->assertSame(1, User::where('is_guest', true)->count(), 'no second guest account');
    }

    public function test_he_cannot_spend_coins_until_he_signs_up(): void
    {
        [$key, $guest] = $this->newGuest();
        $guest->forceFill(['coins' => 100000])->save();

        $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->postJson(route('bags.buy'), ['size' => 6])
            ->assertStatus(422)->assertJsonPath('message', 'Sign up to spend coins.');
        $this->assertSame(100000, $guest->fresh()->coins);
    }

    public function test_for_the_rest_of_the_site_he_is_a_visitor(): void
    {
        [$key] = $this->newGuest();

        $this->withCookie(GuestHunter::COOKIE, $key)->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->withCookie(GuestHunter::COOKIE, $key)->get(route('register'))->assertOk();
        $this->assertGuest();
    }

    public function test_starting_fresh_lets_his_hunters_go(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);

        $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->postJson(route('guest.forget'))->assertOk();
        $this->assertModelMissing($guest);
        // His game stays, under the name he played as
        $this->assertSame('Kestrel', Game::latest('id')->first()->name);
    }

    public function test_signing_up_keeps_everything_he_found(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);

        $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->post(route('register'), [
            'name' => 'Kestrel',
            'email' => 'kestrel@example.test',
            'password' => 'a-long-and-unguessable-one-9',
            'password_confirmation' => 'a-long-and-unguessable-one-9',
        ])->assertSessionHasNoErrors()->assertRedirect();

        $user = $guest->fresh();
        $this->assertFalse($user->is_guest);
        $this->assertNull($user->guest_key);
        $this->assertSame('kestrel@example.test', $user->email);
        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, $user->bossDrops()->count());
    }

    public function test_logging_in_he_may_bring_it_to_his_account_each_hunter_to_his_own(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);
        $guest->forceFill(['coins' => 250, 'materials' => ['alliance' => ['runecloth' => 5]], 'bag_contents' => ['alliance' => ['kingsblood' => 2]], 'bags' => [8]])->save();

        $user = User::factory()->create(['coins' => 1000, 'bags' => [6, 6, 6, 6]]);
        $user->forceFill(['materials' => ['alliance' => ['runecloth' => 10]]])->save();

        // Offered on the game's page
        $boot = $this->boot($this->actingAs($user)->withCookie(GuestHunter::COOKIE, $key)->get(route('play'))->getContent());
        $this->assertFalse($boot['user']['guest']);
        $this->assertSame(1, $boot['guestMerge']['hunters']['alliance']['games']);

        $this->actingAs($user)->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->postJson(route('guest.merge'), ['bring' => true])
            ->assertOk()->assertJsonPath('merged', true);

        $user->refresh();
        $this->assertModelMissing($guest);
        $this->assertSame(1250, $user->coins);
        $this->assertSame(['runecloth' => 15, 'kingsblood' => 2], Bags::bank($user, 'alliance'));
        $this->assertSame([8, 6, 6, 6], $user->bags);
        $this->assertSame(1, $user->bossDrops()->count());
        $this->assertSame($user->id, Game::latest('id')->first()->user_id);
        $this->assertSame([], Bags::bank($user, 'horde'));
    }

    /** A score set as a guest, on the high scores under the name he played under */
    private function guestScore(User $guest): Score
    {
        $game = Game::where('user_id', $guest->id)->latest('id')->firstOrFail();

        return Score::forceCreate(['user_id' => $guest->id, 'game_id' => $game->id, 'name' => $game->name, 'score' => 500, 'level' => 3, 'game_time' => 120]);
    }

    public function test_signing_up_his_games_and_scores_take_his_account_s_name(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);
        $score = $this->guestScore($guest);
        $this->assertSame('Kestrel', $score->name);

        $this->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->post(route('register'), [
            'name' => 'Windrunner',
            'email' => 'windrunner@example.test',
            'password' => 'a-long-and-unguessable-one-9',
            'password_confirmation' => 'a-long-and-unguessable-one-9',
        ])->assertSessionHasNoErrors();

        $this->assertSame(['Windrunner'], Game::where('user_id', $guest->id)->pluck('name')->unique()->values()->all());
        $this->assertSame('Windrunner', $score->fresh()->name);
    }

    public function test_brought_to_an_account_his_games_and_scores_take_its_name(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);
        $score = $this->guestScore($guest);
        $user = User::factory()->create(['name' => 'Sylvanas']);

        $this->actingAs($user)->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->postJson(route('guest.merge'), ['bring' => true])
            ->assertOk()->assertJsonPath('merged', true);

        $this->assertSame(['Sylvanas'], Game::where('user_id', $user->id)->pluck('name')->unique()->values()->all());
        $this->assertSame('Sylvanas', $score->fresh()->name);
        $this->assertSame($user->id, $score->fresh()->user_id);
    }

    public function test_games_brought_over_before_take_their_account_s_name_as_the_deploy_migrates(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);
        $score = $this->guestScore($guest);
        $user = User::factory()->create(['name' => 'Sylvanas']);
        // Brought over before 3.5.7: still under the name played as a guest
        Game::where('user_id', $guest->id)->update(['user_id' => $user->id]);
        $score->forceFill(['user_id' => $user->id])->save();
        // A guest's own games keep his name
        [$otherKey, $other] = $this->newGuest();
        $this->playAndBeatHogger($otherKey);

        (require base_path('database/migrations/2026_10_16_140000_name_games_after_their_accounts.php'))->up();

        $this->assertSame(['Sylvanas'], Game::where('user_id', $user->id)->pluck('name')->unique()->values()->all());
        $this->assertSame('Sylvanas', $score->fresh()->name);
        $this->assertSame(['Kestrel'], Game::where('user_id', $other->id)->pluck('name')->unique()->values()->all());
    }

    public function test_left_behind_it_is_not_offered_again_this_visit(): void
    {
        [$key] = $this->newGuest();
        $this->playAndBeatHogger($key);
        $user = User::factory()->create();

        $this->actingAs($user)->withCredentials()->withCookie(GuestHunter::COOKIE, $key)->postJson(route('guest.merge'), ['bring' => false])->assertOk();
        $boot = $this->boot($this->actingAs($user)->withCookie(GuestHunter::COOKIE, $key)->get(route('play'))->getContent());
        $this->assertNull($boot['guestMerge']);
        $this->assertSame(1, User::where('is_guest', true)->count(), 'still there, for after logging out');
    }

    public function test_guests_away_a_week_are_let_go_and_their_scores_stay(): void
    {
        [$key, $guest] = $this->newGuest();
        $this->playAndBeatHogger($key);
        [, $idle] = $this->newGuest();

        $this->travel(GuestHunter::DAYS + 1)->days();
        [, $fresh] = $this->newGuest();

        $this->assertSame(2, GuestHunter::prune());
        $this->assertModelMissing($guest);
        $this->assertModelMissing($idle);
        $this->assertModelExists($fresh);
        $this->assertNull(Game::latest('id')->first()->user_id);
    }
}
