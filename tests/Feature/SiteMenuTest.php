<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SiteMenu;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteMenuTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_page_in_the_menu_opens_with_its_category_on(): void
    {
        $this->actingAs(User::factory()->create());

        foreach (SiteMenu::categories() as $key => $category) {
            foreach (SiteMenu::pages($key) as $page) {
                $response = $this->get(route($page['route']))->assertOk();
                $this->assertSame($key, SiteMenu::current(), $page['route']);
                // The top bar shows the categories, not every page
                $response->assertSee('Scores')->assertSee('Guide');
            }
        }
    }

    public function test_the_scores_pages_are_tabs_and_my_games_needs_an_account(): void
    {
        $this->get(route('highscores'))
            ->assertOk()
            ->assertSee('site-tab is-on', false)
            ->assertSee(route('live'), false)
            ->assertDontSee(route('games.history'), false);

        $this->assertSame(['highscores', 'live'], array_column(SiteMenu::pages('scores'), 'route'));

        $this->actingAs(User::factory()->create())
            ->get(route('live'))
            ->assertOk()
            ->assertSee(route('games.history'), false);
    }
}
