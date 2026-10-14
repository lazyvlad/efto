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

        $response->assertSee('offline')->assertSee('not finished');
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
        $response->assertSee('2 of 40 found')->assertSee('found 2 times')->assertSee('found once');
    }

    public function test_each_game_shows_the_rare_items_picked_up_in_it(): void
    {
        $player = User::factory()->create();
        $this->game($player, ['offline' => true], ['zee']);

        $this->actingAs($player)
            ->get(route('games.history'))
            ->assertSee('alt="Zee Zgnan Tigar"', false);
    }

    public function test_each_hunter_has_his_own_games_and_records(): void
    {
        $player = User::factory()->create();
        $this->game($player, ['score' => 1111, 'faction' => 'alliance', 'game_time' => 60, 'started_at' => now()->subDay()]);
        $horde = $this->game($player, ['score' => 2222, 'faction' => 'horde', 'game_time' => 90]);

        // Two kills by the Horde hunter in one game, one before fights were timed
        $horde->bossDrops()->create(['user_id' => $player->id, 'boss_id' => 'sarkoth', 'item_id' => 'scorpid-stinger', 'rarity' => 'uncommon', 'dropped_at' => now(),
            'fight_seconds' => 24.5, 'points' => 100, 'speed_points' => 18, 'par_seconds' => 30, 'arrows_used' => 85, 'damage_taken' => 40, 'hits_taken' => 4]);
        $horde->bossDrops()->create(['user_id' => $player->id, 'boss_id' => 'zalazane', 'item_id' => 'darkspear-voodoo-charm', 'rarity' => 'uncommon', 'dropped_at' => now()]);
        // And a faster kill of Sarkoth in a later game, with more arrows
        $this->game($player, ['faction' => 'horde'])->bossDrops()->create(['user_id' => $player->id, 'boss_id' => 'sarkoth', 'item_id' => 'scorpid-stinger', 'rarity' => 'uncommon', 'dropped_at' => now(),
            'fight_seconds' => 12.0, 'points' => 100, 'speed_points' => 60, 'par_seconds' => 30, 'arrows_used' => 120, 'damage_taken' => 70, 'hits_taken' => 9]);

        // The hunter played last is shown first
        $response = $this->actingAs($player)->get(route('games.history'))->assertOk();
        $this->assertSame('horde', $response->viewData('side'));
        $response->assertSee('2,222')->assertDontSee('1,111')
            ->assertSee('24.5s')->assertSee('+18 speed')->assertSee('in 4 hits')
            ->assertSee('Fights from before 3.0.6 were not timed.');
        $this->assertSame(['played' => 2, 'best' => 2222, 'seconds' => 90], $response->viewData('stats'));

        // His best against each boss, by each measure, from any of his fights
        $sarkoth = $response->viewData('records')['sarkoth'];
        $this->assertSame([2, 12.0, 30, 160, 85, 40], [$sarkoth['kills'], $sarkoth['fastest'], $sarkoth['par'], $sarkoth['mostPoints'], $sarkoth['fewestArrows'], $sarkoth['leastDamage']]);
        $this->assertSame(1, $response->viewData('records')['zalazane']['kills']);
        $this->assertNull($response->viewData('records')['zalazane']['fastest']);
        $this->assertCount(10, $response->viewData('records'));

        // The other hunter's page has his own
        $alliance = $this->get(route('games.history', ['hunter' => 'alliance']))->assertOk();
        $alliance->assertSee('1,111')->assertDontSee('2,222');
        $this->assertSame(0, $alliance->viewData('records')['garrick-padfoot']['kills']);
        $this->assertArrayNotHasKey('sarkoth', $alliance->viewData('records'));
    }

    public function test_the_site_menu_links_to_it_for_logged_in_players_only(): void
    {
        $this->get('/')->assertDontSee(route('games.history'), false);
        $this->actingAs(User::factory()->create())->get('/')->assertSee(route('games.history'), false);
    }
}
