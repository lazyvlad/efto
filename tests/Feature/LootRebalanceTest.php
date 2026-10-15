<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\BossLoot;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Where gear comes from (the art agent's loot proposal, art-workbench/loot-distribution): the
 * bosses drop their own items, their zone's and the epics that used to fall; the sky drops the
 * zone's greens and blues in their place.
 */
class LootRebalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_zone_item_is_in_the_catalogue_with_its_picture(): void
    {
        $catalog = Gear::catalog();
        $this->assertGreaterThanOrEqual(52, count(Gear::zoneItems()));
        foreach (Gear::zoneItems() as $itemId => $item) {
            $this->assertArrayHasKey($itemId, $catalog);
            $this->assertFileExists(base_path("game/assets/items/gear/$itemId.webp"));
            $this->assertNotSame('', Gear::zoneName($item['side'], $item['zone']));
        }
    }

    public function test_a_boss_drops_its_own_item_or_one_of_its_pool_by_weight(): void
    {
        $gath = BossLoot::boss('gath-ilzogg');
        // Its own purple at 4, the two rings that used to fall at 1 each
        $this->assertSame(['head-of-gathilzogg' => 4, 'quick-strike-ring' => 1, 'circle-of-applied-force' => 1], BossLoot::pool($gath, 'epic'));

        config(['boss_loot.chances' => ['uncommon' => 0, 'rare' => 0, 'epic' => 1]]);
        $seen = [];
        for ($i = 0; $i < 600; $i++) {
            $item = BossLoot::roll($gath);
            $this->assertSame('epic', $item['rarity']);
            $seen[$item['id']] = ($seen[$item['id']] ?? 0) + 1;
        }
        $this->assertEqualsCanonicalizing(['head-of-gathilzogg', 'quick-strike-ring', 'circle-of-applied-force'], array_keys($seen));
        $this->assertGreaterThan($seen['quick-strike-ring'] * 2, $seen['head-of-gathilzogg']);
        $this->assertSame('Quick Strike Ring', BossLoot::item($gath, 'quick-strike-ring')['name']);
    }

    public function test_gear_not_in_the_game_yet_never_drops(): void
    {
        // Every pool entry that is not in the catalogue is left out
        $catalog = Gear::catalog();
        foreach (config('boss_loot.bosses') as $bosses) {
            foreach (array_keys($bosses) as $bossId) {
                foreach (['uncommon', 'rare', 'epic'] as $rarity) {
                    foreach (array_keys(BossLoot::pool(BossLoot::boss($bossId), $rarity)) as $itemId) {
                        $this->assertArrayHasKey($itemId, $catalog, "$bossId $itemId");
                    }
                }
            }
        }
    }

    public function test_what_a_boss_of_his_side_drops_from_its_pool_is_his_hunter_s(): void
    {
        $user = User::factory()->create();
        $user->bossDrops()->create(['boss_id' => 'gath-ilzogg', 'item_id' => 'quick-strike-ring', 'rarity' => 'epic', 'dropped_at' => now()]);

        $this->assertSame(1, Gear::owned($user, 'alliance')['quick-strike-ring'] ?? 0);
        $this->assertArrayNotHasKey('quick-strike-ring', Gear::owned($user, 'horde'));
    }

    public function test_the_zone_s_greens_and_blues_fall_greens_more_often(): void
    {
        $token = $this->postJson(route('games.open'), ['faction' => 'horde'])->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $pool = config('gear.zone_items.horde.1');

        $fell = ['uncommon' => 0, 'rare' => 0];
        for ($i = 0; $i < 400; $i++) {
            foreach ($game->skyGear(3) as $drop) {
                $this->assertTrue($drop['falls']);
                $this->assertArrayHasKey($drop['item_id'], $pool);
                $fell[$pool[$drop['item_id']]['rarity']]++;
            }
        }
        $this->assertGreaterThan($fell['rare'] * 2, $fell['uncommon']);
        $this->assertGreaterThan(0, $fell['rare']);

        // Offered to fall, not for a creature to carry
        $drop = $game->drops()->create(['item_id' => 'durotar-copper-loop', 'chunk' => 9, 'at_seconds' => 280, 'falls' => true]);
        $this->assertArrayNotHasKey('creature', $drop->forGame());
    }

    public function test_the_quiver_and_the_bindings_come_from_the_later_bosses(): void
    {
        config(['boss_loot.quiver.chance' => 1]);
        $user = User::factory()->create();
        $this->assertFalse(BossLoot::rollQuiver($user, 'alliance', 3));
        $this->assertTrue(BossLoot::rollQuiver($user, 'alliance', 4));
    }
}
