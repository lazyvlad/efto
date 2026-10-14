<?php

namespace Tests\Feature;

use App\Support\LootTable;
use Tests\TestCase;

class ItemsPageTest extends TestCase
{
    public function test_the_page_lists_every_item_by_what_becomes_of_it(): void
    {
        $response = $this->get(route('items'))->assertOk();

        foreach (LootTable::catalog() as $item) {
            $response->assertSee($item['name']);
        }
        $response->assertSee('71 items in all');

        // Kept and worn, kept for crafting, then sold: each where it belongs
        $response->assertSeeInOrder([
            'The hunter sets', 'Giantstalker Armor', 'Each piece: +3 health, +4 armor, +2 attack power', '8 pieces', 'Multishot hits 40% harder',
            'Boss loot', 'Weapons and jewellery that fall', 'Ashkandi', 'Main hand, two-handed', '+17 attack power',
            'Materials', 'Runecloth',
            'Sold for coins', 'Zee Zgnan', '10s each', 'Legendary', '5s each', 'Uncommon', '25c each', 'Common', '10c each',
        ]);
    }

    public function test_the_sets_here_give_what_they_give_in_the_game(): void
    {
        $config = file_get_contents(base_path('game/config/gameConfig.js'));

        foreach (config('loot.sets') as $id => $set) {
            $this->assertSame(1, preg_match("/id: '$id'.*?perPiece: \\{ health: (\\d+), armor: (\\d+), attackPower: (\\d+) \\},\\s*bonuses: \\[(.*?)\\],\\n/s", $config, $found), $id);
            $this->assertSame(['health' => (int) $found[1], 'armor' => (int) $found[2], 'attackPower' => (int) $found[3]], $set['per_piece'], $id);

            preg_match_all('/\\{ pieces: (\\d+), ([^}]*) \\}/', $found[4], $steps, PREG_SET_ORDER);
            $bonuses = [];
            foreach ($steps as [, $pieces, $gives]) {
                preg_match_all('/(\\w+): ([\\d.]+)/', $gives, $pairs, PREG_SET_ORDER);
                $bonuses[(int) $pieces] = array_map('floatval', array_column($pairs, 2, 1));
            }
            $this->assertEquals($set['bonuses'], $bonuses, $id);
        }
    }

    public function test_the_page_lists_the_bosses_with_their_pay_and_loot(): void
    {
        $this->get(route('items'))
            ->assertOk()
            ->assertSeeInOrder(['Hogger', 'zone 2', '2s', "Hogger's Chewed Collar", 'Neck', 'Huge Gnoll Claw', "Hogger's Trophy Axe", 'two-handed'])
            ->assertSee('70% of the time')
            ->assertSee('Chief Ukorz Sandscalp');
    }

    public function test_guests_can_see_it_and_the_site_menu_links_to_it(): void
    {
        $this->get(route('items'))->assertOk()->assertSee('Log in to keep yours.');
        $this->get('/')->assertSee(route('items'), false);
    }
}
