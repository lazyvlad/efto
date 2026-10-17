<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\BossLoot;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The early bosses drop their zone's green and blue gear besides their item, pieces the hunter
 * lacks first (config/boss_loot.php "extras").
 */
class BossExtrasTest extends TestCase
{
    use RefreshDatabase;

    private function kill(?User $user, string $bossId, array $open = []): array
    {
        $boss = BossLoot::boss($bossId);
        if ($user) {
            $this->actingAs($user);
        }
        $token = $this->postJson(route('games.open'), ['faction' => $boss['faction']] + $open)->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $this->travel(600)->seconds();

        return $this->postJson(route('games.boss', $game), ['boss' => $bossId])->assertOk()->json() + ['game' => $game];
    }

    public function test_the_first_three_bosses_drop_two_of_their_zone_s_gear_and_later_ones_none(): void
    {
        foreach (['alliance' => ['garrick-padfoot', 'hogger', 'bazil-thredd'], 'horde' => ['sarkoth', 'zalazane', 'taragaman']] as $side => $bosses) {
            foreach ($bosses as $zone => $bossId) {
                $drop = $this->kill(User::factory()->create(), $bossId);
                $this->assertCount(2, $drop['extras'], $bossId);
                $zoneItems = config("gear.zone_items.$side.".($zone + 1));
                foreach ($drop['extras'] as $extra) {
                    $this->assertArrayHasKey($extra['id'], $zoneItems, "$bossId: its zone's");
                    $this->assertContains($extra['rarity'], ['uncommon', 'rare']);
                    $this->assertNotSame($drop['item']['id'], $extra['id']);
                }
                $this->assertNotSame($drop['extras'][0]['id'], $drop['extras'][1]['id']);
            }
        }
        $this->assertSame([], $this->kill(User::factory()->create(), 'edwin-vancleef')['extras']);
    }

    public function test_they_are_his_hunter_s_pieces_he_lacked_first_and_never_offered_again(): void
    {
        $user = User::factory()->create();
        $zoneItems = array_keys(config('gear.zone_items.alliance.1'));
        // Kill after kill: a piece he had only once he lacked none the boss could give
        for ($i = 0; $i < 3; $i++) {
            $before = Gear::owned($user->fresh(), 'alliance');
            $drop = $this->kill($user, 'garrick-padfoot');
            $lacking = array_values(array_diff($zoneItems, array_keys($before), [$drop['item']['id']]));
            $extras = array_column($drop['extras'], 'id');
            $this->assertSame(min(2, count($lacking)), count(array_intersect($extras, $lacking)), 'kill '.($i + 1).': the pieces he lacked first');
            $owned = Gear::owned($user->fresh(), 'alliance');
            foreach ($extras as $id) {
                $this->assertArrayHasKey($id, $owned, 'his now');
            }
        }
        $this->assertSame([], array_values(array_intersect($zoneItems, array_keys(Gear::owned($user->fresh(), 'horde')))), 'the Horde hunter has none');

        // The same report again: the same extras, not twice his
        $game = $drop['game'];
        $again = $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk()->json();
        $this->assertSame($drop['extras'], $again['extras']);
        $this->assertSame(2, $game->drops()->where('chunk', Game::BOSS_CHUNK)->count());
        // Never handed to the game among a chunk's drops
        $handed = array_column($this->postJson(route('games.drops', $game), ['chunk' => 0])->assertOk()->json('drops'), 'id');
        $recorded = $game->drops()->where('chunk', Game::BOSS_CHUNK)->pluck('id')->all();
        $this->assertSame([], array_values(array_intersect($handed, $recorded)));
    }

    public function test_only_in_a_normal_game(): void
    {
        $boss = BossLoot::boss('garrick-padfoot');
        $this->assertCount(2, BossLoot::rollExtras(null, $boss, Game::NORMAL, 'garricks-red-bandana'));
        $this->assertSame([], BossLoot::rollExtras(null, $boss, 'boss_fight', 'garricks-red-bandana'));
        $this->assertSame([], BossLoot::rollExtras(null, $boss, 'boss_rush', 'garricks-red-bandana'));
    }
}
