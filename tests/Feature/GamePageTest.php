<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GamePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_shows_the_game_under_the_site_header_for_guests(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('src="'.e(route('play', ['embedded' => 1])).'"', false)
            ->assertSee(route('login'), false)
            ->assertSee(route('register'), false);
    }

    public function test_home_header_shows_the_account_for_logged_in_players(): void
    {
        $user = User::factory()->create(['name' => 'Jaina']);

        $this->actingAs($user)->get('/')
            ->assertOk()
            ->assertSee('Jaina')
            ->assertSee(route('profile.edit'), false)
            ->assertDontSee(route('register'), false);
    }

    public function test_pages_carry_the_footer_credit(): void
    {
        foreach (['/', route('highscores'), route('login'), route('register')] as $page) {
            $this->get($page)->assertOk()->assertSee('href="https://barkoder.com"', false);
        }
    }

    public function test_the_game_is_told_when_it_is_framed_by_the_site(): void
    {
        $this->assertFalse($this->bootData($this->get(route('play'))->getContent())['embedded']);
        $this->assertTrue($this->bootData($this->get(route('play', ['embedded' => 1]))->getContent())['embedded']);
    }

    public function test_guests_can_open_the_game_and_get_a_guest_name(): void
    {
        $response = $this->get(route('play'))->assertOk();

        $boot = $this->bootData($response->getContent());

        $this->assertNull($boot['user']);
        $this->assertMatchesRegularExpression('/^[A-Z][a-z]+[A-Z][a-z]+\d{3}$/', $boot['guestName']);
        $this->assertSame(route('scores.index'), $boot['urls']['scores']);
        $this->assertNotEmpty($boot['csrfToken']);
        $response->assertSee('<base href="'.asset('game').'/">', false);
    }

    public function test_the_guest_name_stays_the_same_for_the_session(): void
    {
        $first = $this->bootData($this->get(route('play'))->getContent());
        $second = $this->bootData($this->get(route('play'))->getContent());

        $this->assertSame($first['guestName'], $second['guestName']);
    }

    public function test_logged_in_players_are_passed_to_the_game(): void
    {
        $user = User::factory()->create(['name' => 'Jaina']);

        $boot = $this->bootData($this->actingAs($user)->get(route('play'))->getContent());

        $this->assertSame('Jaina', $boot['user']['name']);
        $this->assertNull($boot['guestName']);
    }

    public function test_the_game_gets_the_players_profile_image_when_there_is_one(): void
    {
        $user = User::factory()->create();

        $this->assertNull($this->bootData($this->actingAs($user)->get(route('play'))->getContent())['user']['avatar']);

        $user->forceFill(['avatar' => 'avatars/1-abc.webp'])->save();

        $this->assertSame(
            asset('storage/avatars/1-abc.webp'),
            $this->bootData($this->actingAs($user)->get(route('play'))->getContent())['user']['avatar']
        );
    }

    private function bootData(string $html): array
    {
        $this->assertSame(1, preg_match('/window\.INPUT_BOOT = (\{.*?\});<\/script>/s', $html, $matches));

        return json_decode($matches[1], true);
    }
}
