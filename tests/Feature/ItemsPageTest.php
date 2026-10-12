<?php

namespace Tests\Feature;

use App\Support\LootTable;
use Tests\TestCase;

class ItemsPageTest extends TestCase
{
    public function test_the_page_lists_every_item_with_what_it_pays(): void
    {
        $response = $this->get(route('items'))->assertOk();

        foreach (LootTable::catalog() as $item) {
            $response->assertSee($item['name']);
        }

        // Rarest first, each rarity with its price
        $response->assertSeeInOrder(['Zee Zgnan', '10s each', 'Legendary', '5s each', 'Epic', '1s each', 'Uncommon', '25c each', 'Common', '10c each']);
        $response->assertSee('71 items in all');
    }

    public function test_the_page_lists_the_bosses_with_their_pay_and_loot(): void
    {
        $this->get(route('items'))
            ->assertOk()
            ->assertSeeInOrder(['Hogger', 'zone 2', '2s', "Hogger's Chewed Collar", 'Huge Gnoll Claw', "Hogger's Trophy Axe"])
            ->assertSee('70% of the time')
            ->assertSee('Chief Ukorz Sandscalp');
    }

    public function test_guests_can_see_it_and_the_site_menu_links_to_it(): void
    {
        $this->get(route('items'))->assertOk()->assertSee('Log in to keep yours.');
        $this->get('/')->assertSee(route('items'), false);
    }
}
