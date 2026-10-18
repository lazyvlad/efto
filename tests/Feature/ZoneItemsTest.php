<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ZoneItemsTest extends TestCase
{
    use RefreshDatabase;

    private function openGame(array $payload): Game
    {
        $token = $this->postJson(route('games.open'), $payload)->assertOk()->json('game');

        return Game::where('token', $token)->firstOrFail();
    }

    public function test_each_starting_zone_has_its_five_items_in_the_catalogue(): void
    {
        $catalog = Gear::catalog();
        foreach (['alliance', 'horde'] as $side) {
            $pool = config("gear.zone_items.$side.1");
            // Its five, and nothing else: its armor set drops only from its bosses (zone_armor)
            $this->assertCount(5, $pool);
            foreach (array_keys($pool) as $itemId) {
                $this->assertArrayHasKey($itemId, $catalog);
                $this->assertArrayNotHasKey('side', $catalog[$itemId], 'either hunter can wear it');
                $this->assertFileExists(base_path("game/assets/items/gear/$itemId.webp"));
            }
        }
    }

    public function test_the_first_zone_gives_its_creatures_three_of_its_items_to_carry(): void
    {
        $response = $this->actingAs(User::factory()->create())->postJson(route('games.open'), ['faction' => 'horde'])->assertOk();

        $carried = collect($response->json('drops'))->where('creature', true);
        $this->assertCount(3, $carried, 'a generous first zone');
        $pool = array_keys(config('gear.zone_items.horde.1'));
        foreach ($carried as $drop) {
            $this->assertContains($drop['item'], $pool, 'only the zone\'s own');
        }
        $this->assertCount(3, $carried->pluck('item')->unique(), 'three different ones');

        // No more while the game is still in the zone
        $game = Game::where('token', $response->json('game'))->firstOrFail();
        $this->travel(20)->seconds();
        $next = $this->postJson(route('games.drops', $game), ['chunk' => 1, 'progress' => ['level' => 2]])->assertOk();
        $this->assertCount(0, collect($next->json('drops'))->where('creature', true));
    }

    public function test_only_a_normal_game_has_them(): void
    {
        $game = $this->openGame(['faction' => 'horde']);
        $this->assertNotEmpty($game->zoneOffers(5, []));

        $game->forceFill(['mode' => Game::BOSS_FIGHT])->save();
        $this->assertSame([], $game->zoneOffers(5, []));
        $game->forceFill(['mode' => Game::BOSS_RUSH])->save();
        $this->assertSame([], $game->zoneOffers(5, []));
    }

    public function test_a_zone_without_items_gives_none(): void
    {
        // A zone whose items are not painted yet
        config(['gear.zone_items.alliance.4' => []]);
        $game = $this->openGame(['faction' => 'alliance']);
        $game->forceFill(['live' => ['level' => 7]])->save();     // Zone 4
        $this->assertSame([], $game->fresh()->zoneOffers(5, []));
    }

    public function test_what_one_hunter_catches_is_his_alone(): void
    {
        $user = User::factory()->create();
        $game = $this->actingAs($user)->openGame(['faction' => 'alliance']);
        $drop = $game->drops()->get()->first(fn ($drop) => array_key_exists($drop->item_id, Gear::zoneItems()));
        $this->assertNotNull($drop);

        $this->travel(40)->seconds();
        $this->postJson(route('games.finish', $game), [
            'score' => 100, 'level' => 2, 'gameTime' => 39, 'pickups' => [$drop->id], 'items' => [],
        ])->assertOk();

        $this->assertSame(1, Gear::owned($user, 'alliance')[$drop->item_id] ?? 0, 'the Alliance hunter caught it');
        $this->assertArrayNotHasKey($drop->item_id, Gear::owned($user, 'horde'), 'the Horde hunter did not');
    }

    public function test_trailhide_drops_only_as_the_first_bosses_extra_drops(): void
    {
        $armor = array_keys(config('gear.zone_armor.1'));
        $this->assertCount(16, $armor);
        foreach (['alliance', 'horde'] as $side) {
            // Not among what its creatures carry or its sky drops
            $this->assertEmpty(array_intersect($armor, array_keys(config("gear.zone_items.$side.1"))));
            // Among the boss's extras, for either side: in 40 kills, some of it
            $seen = [];
            for ($i = 0; $i < 40; $i++) {
                foreach (\App\Support\BossLoot::rollExtras(null, ['faction' => $side, 'zone' => 1], Game::NORMAL, 'none') as $itemId) {
                    $seen[$itemId] = true;
                }
            }
            $this->assertNotEmpty(array_intersect($armor, array_keys($seen)), $side);
            $this->assertEmpty(array_diff(array_keys($seen), array_merge($armor, array_keys(config("gear.zone_items.$side.1")))));
        }
    }

    public function test_trailhide_is_both_first_zones_and_named_after_both(): void
    {
        $zoneItems = Gear::zoneItems();
        $hood = $zoneItems['trailhide-hood-rare'];
        $this->assertSame(['alliance', 'horde'], $hood['sides']);
        $this->assertSame('Northshire Abbey or Valley of Trials', $hood['zoneName']);
        $this->assertSame('rare', $hood['rarity']);
        $this->assertSame(15, $hood['item_level']);

        $catalog = Gear::catalog();
        $this->assertSame('Found in Northshire Abbey or Valley of Trials', $catalog['trailhide-gloves']['from']);
        $this->assertSame(['attackPower' => 1, 'armor' => 3], $catalog['trailhide-gloves']['stats']);

        // The items page lists it under both sides
        $this->get(route('items'))->assertOk()->assertSee('Fine Trailhide Jerkin');
    }
}
