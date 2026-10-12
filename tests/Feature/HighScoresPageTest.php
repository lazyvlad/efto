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

    public function test_the_page_works_with_no_scores(): void
    {
        $this->get(route('highscores'))->assertOk()->assertSee('No scores yet.');
    }

    public function test_the_site_menu_links_to_it(): void
    {
        $this->get('/')->assertSee(route('highscores'), false);
    }
}
