<?php

namespace Tests\Feature;

use App\Models\Score;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HighScoresPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_page_lists_scores_best_first(): void
    {
        $player = User::factory()->create(['name' => 'Jaina']);

        Score::create(['name' => 'GuestOne', 'score' => 500, 'level' => 3]);
        Score::create(['name' => 'Jaina', 'score' => 12345, 'level' => 9, 'user_id' => $player->id]);

        $this->get(route('highscores'))
            ->assertOk()
            ->assertSeeInOrder(['Jaina', '12,345', 'GuestOne', '500']);
    }

    public function test_the_page_says_how_many_bosses_each_game_defeated(): void
    {
        $game = \App\Models\Game::create(['token' => 'abc', 'name' => 'Rexxar', 'status' => 'finished', 'started_at' => now()]);
        $game->bossDrops()->create(['boss_id' => 'hogger', 'item_id' => 'huge-gnoll-claw', 'rarity' => 'rare', 'dropped_at' => now()]);
        $game->bossDrops()->create(['boss_id' => 'garrick-padfoot', 'item_id' => 'garricks-head', 'rarity' => 'epic', 'dropped_at' => now()]);
        Score::create(['name' => 'Rexxar', 'score' => 900, 'level' => 5, 'game_id' => $game->id]);

        $this->get(route('highscores'))
            ->assertOk()
            ->assertSee('Bosses')
            ->assertSeeInOrder(['Rexxar', '900', '5', '2']);
    }

    public function test_the_page_works_with_no_scores(): void
    {
        $this->get(route('highscores'))->assertOk()->assertSee('No scores yet.');
    }

    public function test_the_site_menu_links_to_it(): void
    {
        $this->get('/')->assertSee(route('highscores'), false);
    }
}
