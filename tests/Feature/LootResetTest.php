<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\Bags;
use App\Support\BossLoot;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Everyone starts over (database/migrations/2026_10_16_100000_start_every_hunter_over.php): what
 * was found before counts no more, the record of it stays.
 */
class LootResetTest extends TestCase
{
    use RefreshDatabase;

    private function hunterWithLoot(): User
    {
        $user = User::factory()->create();
        $user->forceFill([
            'coins' => 50000,
            'quiver' => true,
            'bags' => [14, 14],
            'materials' => ['alliance' => ['runecloth' => 40]],
            'bag_contents' => ['alliance' => ['kingsblood' => 3]],
            'equipment' => ['alliance' => ['head' => 'garricks-red-bandana']],
            'carried' => ['alliance' => ['garricks-red-bandana']],
            'granted_pieces' => ['alliance' => ['giantstalker-helmet']],
        ])->save();
        $game = Game::create(['token' => 'reset-test', 'user_id' => $user->id, 'name' => 'Tester', 'faction' => 'alliance', 'start_zone' => 1, 'mode' => 'normal', 'started_at' => now()]);
        $user->bossDrops()->create(['game_id' => $game->id, 'boss_id' => 'garrick-padfoot', 'item_id' => 'garricks-red-bandana', 'rarity' => 'uncommon', 'quiver' => true, 'set_piece' => null, 'dropped_at' => now()]);
        $user->bossDrops()->create(['game_id' => $game->id, 'boss_id' => 'edwin-vancleef', 'item_id' => 'blackened-defias-belt', 'rarity' => 'uncommon', 'set_piece' => 'giantstalker-boots', 'dropped_at' => now()]);
        $game->drops()->create(['item_id' => 'ashkandi2', 'chunk' => 1, 'at_seconds' => 40, 'claimed_at' => now()]);

        return $user->fresh();
    }

    public function test_everyone_starts_over_in_their_starting_clothes_and_the_record_stays(): void
    {
        $user = $this->hunterWithLoot();
        $this->assertArrayHasKey('garricks-red-bandana', Gear::owned($user, 'alliance'));
        $this->assertSame(2, BossLoot::unlockedZone($user, 'alliance'));

        // The migration, as the deploy runs it
        Schema::table('users', fn ($table) => $table->dropColumn('loot_reset_at'));
        $this->travel(1)->minutes();
        (require base_path('database/migrations/2026_10_16_100000_start_every_hunter_over.php'))->up();
        $user = $user->fresh();

        // Only the clothes he starts in
        $this->assertSame(array_values(Gear::starterLoadout('alliance')), array_keys(Gear::owned($user, 'alliance')));
        $this->assertSame([], $user->setPieces('alliance'));
        $this->assertSame([], Gear::quiverSides($user));
        $this->assertSame(1, BossLoot::unlockedZone($user, 'alliance'));
        $this->assertSame(0, $user->coins);
        $this->assertSame(config('loot.bags.backpack'), Bags::capacity($user), 'the backpack only, no bags bought');
        $this->assertSame([], Bags::bank($user, 'alliance'));
        $this->assertSame([], Bags::contents($user, 'alliance'));
        $this->assertNull($user->equipment);

        // The record of it stays
        $this->assertSame(2, Game::where('token', 'reset-test')->sole()->bossDrops()->count());
        $this->assertSame(1, Game::where('token', 'reset-test')->sole()->drops()->whereNotNull('claimed_at')->count());

        // What he finds from now on is his
        $this->travel(1)->minutes();
        $next = Game::create(['token' => 'reset-test-2', 'user_id' => $user->id, 'name' => 'Tester', 'faction' => 'alliance', 'start_zone' => 1, 'mode' => 'normal', 'started_at' => now()]);
        $user->bossDrops()->create(['game_id' => $next->id, 'boss_id' => 'garrick-padfoot', 'item_id' => 'garricks-red-bandana', 'rarity' => 'uncommon', 'dropped_at' => now()]);
        $this->assertSame(1, Gear::owned($user->fresh(), 'alliance')['garricks-red-bandana'] ?? 0);
        $this->assertSame(2, BossLoot::unlockedZone($user->fresh(), 'alliance'));
    }
}
