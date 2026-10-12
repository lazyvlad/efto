<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GamePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_redirects_to_the_game(): void
    {
        $this->get('/')->assertRedirect('play');
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

    private function bootData(string $html): array
    {
        $this->assertSame(1, preg_match('/window\.INPUT_BOOT = (\{.*?\});<\/script>/s', $html, $matches));

        return json_decode($matches[1], true);
    }
}
