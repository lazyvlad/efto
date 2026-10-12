<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class GameHistoryPageTest extends TestCase
{
    use RefreshDatabase;

    private function game(?User $user, array $attributes = [], array $pickedUp = []): Game
    {
        $game = Game::create($attributes + [
            'token' => Str::random(40),
            'user_id' => $user?->id,
            'name' => $user?->name ?? 'Guest',
            'status' => Game::FINISHED,
            'started_at' => now(),
        ]);

        foreach ($pickedUp as $itemId) {
            $game->drops()->create(['item_id' => $itemId, 'chunk' => 0, 'at_seconds' => 5, 'claimed_at' => now()]);
        }

        return $game;
    }

    public function test_guests_are_sent_to_log_in(): void
    {
        $this->get(route('games.history'))->assertRedirect(route('login'));
    }

    public function test_the_page_works_with_no_games(): void
    {
        $this->actingAs(User::factory()->create())
            ->get(route('games.history'))
            ->assertOk()
            ->assertSee('No games yet.');
    }

    public function test_a_player_sees_their_own_games_newest_first(): void
    {
        $player = User::factory()->create();
        $other = User::factory()->create();

        $this->game($player, ['score' => 1111, 'started_at' => now()->subDay()]);
        $this->game($player, ['score' => 2222]);
        $this->game($other, ['score' => 9999]);
        $this->game($player, ['score' => 7777, 'status' => Game::OPEN]);

        $this->actingAs($player)
            ->get(route('games.history'))
            ->assertOk()
            ->assertSeeInOrder(['2,222', '1,111'])
            ->assertDontSee('9,999')
            ->assertDontSee('7,777');
    }

    public function test_games_that_do_not_count_are_marked_and_left_out_of_the_totals(): void
    {
        $player = User::factory()->create();

        $this->game($player, ['score' => 300, 'game_time' => 90]);
        $this->game($player, ['score' => 8000, 'offline' => true]);
        $this->game($player, ['score' => 5000, 'status' => Game::ABANDONED]);

        $response = $this->actingAs($player)->get(route('games.history'))->assertOk();

        $response->assertSee('Offline')->assertSee('Not finished');
        $this->assertSame(['played' => 1, 'best' => 300, 'seconds' => 90], $response->viewData('stats'));
    }

    public function test_the_collection_counts_rare_items_from_games_that_count(): void
    {
        $player = User::factory()->create();
        $other = User::factory()->create();

        $this->game($player, [], ['ThunderFury', 'maladath']);
        $this->game($player, [], ['ThunderFury']);
        $this->game($player, ['offline' => true], ['zee']);
        $this->game($other, [], ['zee']);
        // Offered but not picked up
        $this->game($player)->drops()->create(['item_id' => 'onslaught', 'chunk' => 0, 'at_seconds' => 5]);

        $response = $this->actingAs($player)->get(route('games.history'))->assertOk();

        $this->assertEquals(['ThunderFury' => 2, 'maladath' => 1], $response->viewData('found')->all());
        $response->assertSee('2 of 23 found')->assertSee('found 2 times')->assertSee('found once');
    }

    public function test_each_game_shows_the_rare_items_picked_up_in_it(): void
    {
        $player = User::factory()->create();
        $this->game($player, ['offline' => true], ['zee']);

        $this->actingAs($player)
            ->get(route('games.history'))
            ->assertSee('alt="Zee Zgnan Tigar"', false);
    }

    public function test_the_site_menu_links_to_it_for_logged_in_players_only(): void
    {
        $this->get('/')->assertDontSee(route('games.history'), false);
        $this->actingAs(User::factory()->create())->get('/')->assertSee(route('games.history'), false);
    }
}
