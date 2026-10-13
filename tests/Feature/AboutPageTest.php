<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AboutPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_page_says_who_is_behind_the_game(): void
    {
        $this->get(route('about'))
            ->assertOk()
            ->assertSee('a guild in World of Warcraft')
            ->assertSee('Discord');
    }

    public function test_the_menu_links_to_it_and_keeps_my_games_and_items_under_the_player_s_name(): void
    {
        // A guest reaches About from the menu and Items from the foot of the page
        $this->get(route('highscores'))
            ->assertSee(route('about'), false)
            ->assertSee(route('items'), false)
            ->assertDontSee(route('games.history'), false);

        $this->actingAs(User::factory()->create())->get(route('highscores'))
            ->assertSee(route('games.history'), false)
            ->assertSee(route('items'), false);
    }
}
