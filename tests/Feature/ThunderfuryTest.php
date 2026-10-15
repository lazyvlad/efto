<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\Bags;
use App\Support\BossLoot;
use App\Support\Gear;
use App\Support\Grants;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThunderfuryTest extends TestCase
{
    use RefreshDatabase;

    private const LEFT = 'left-binding-of-the-windseeker';

    private const RIGHT = 'right-binding-of-the-windseeker';

    private function hunterWithEverything(string $side = 'horde'): User
    {
        $user = User::factory()->create();
        $user->forceFill(['bag_contents' => [$side => [self::LEFT => 1, self::RIGHT => 1, 'fiery-core' => 10, 'lava-core' => 12, 'essence-of-water' => 4]]])->save();

        return $user->fresh();
    }

    public function test_it_is_a_legendary_blade_that_calls_down_lightning(): void
    {
        $blade = Gear::catalog()['thunderfury'];

        $this->assertSame('legendary', $blade['rarity']);
        $this->assertSame('mainhand', $blade['slot']);
        $this->assertFalse($blade['twoHanded']);
        $this->assertSame('chain-lightning', $blade['effect']);
        $this->assertSame('pickup', $blade['binding']);
        $this->assertSame('Crafted', $blade['from']);
    }

    public function test_a_hunter_makes_it_from_his_bags_once_and_it_is_his(): void
    {
        $user = $this->hunterWithEverything();

        $this->actingAs($user)->postJson(route('craft'), ['recipe' => 'thunderfury', 'count' => 1, 'side' => 'horde'])
            ->assertOk()
            ->assertJsonPath('gear.thunderfury', 1)
            ->assertJsonPath('bound.thunderfury', 1)
            // What it took is gone; the Lava Core over is still there
            ->assertJsonPath('bags', ['lava-core' => 2]);

        $this->assertSame(1, Gear::owned($user->fresh(), 'horde')['thunderfury']);
        // His, not the other hunter's
        $this->assertArrayNotHasKey('thunderfury', Gear::owned($user->fresh(), 'alliance'));

        // He wears it
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => ['mainhand' => 'thunderfury']])
            ->assertOk()->assertJsonPath('equipment.mainhand', 'thunderfury');

        // One to a hunter
        $user->fresh()->forceFill(['bag_contents' => ['horde' => [self::LEFT => 1, self::RIGHT => 1, 'fiery-core' => 10, 'lava-core' => 10, 'essence-of-water' => 4]]])->save();
        $this->postJson(route('craft'), ['recipe' => 'thunderfury', 'count' => 1, 'side' => 'horde'])->assertStatus(422);
        $this->assertSame(1, Gear::owned($user->fresh(), 'horde')['thunderfury']);
    }

    public function test_an_admin_gives_it_to_one_hunter_to_try_it_and_takes_it_back(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();
        $player = User::factory()->create();

        $this->actingAs($admin)->get(route('admin.users.show', $player))->assertOk()->assertSee('Thunderfury, Blessed Blade of the Windseeker');
        $this->post(route('admin.users.gear', $player), ['side' => 'alliance', 'item' => 'thunderfury'])->assertSessionHas('status');
        $this->assertSame(1, Gear::owned($player->fresh(), 'alliance')['thunderfury']);
        $this->assertArrayNotHasKey('thunderfury', Gear::owned($player->fresh(), 'horde'));

        // He puts it on
        $this->actingAs($player->fresh())->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => ['mainhand' => 'thunderfury']])
            ->assertOk()->assertJsonPath('equipment.mainhand', 'thunderfury');

        // Only crafted gear is given on its own
        $this->actingAs($admin)->post(route('admin.users.gear', $player), ['side' => 'alliance', 'item' => 'ds_legs'])->assertSessionHasErrors('item');

        $this->post(route('admin.users.gear', $player), ['side' => 'alliance', 'item' => 'thunderfury', 'take' => 1]);
        $this->assertArrayNotHasKey('thunderfury', Gear::owned($player->fresh(), 'alliance'));
    }

    public function test_it_takes_everything_and_is_made_one_at_a_time(): void
    {
        $user = $this->hunterWithEverything('alliance');
        $user->forceFill(['bag_contents' => ['alliance' => [self::LEFT => 1, 'fiery-core' => 10, 'lava-core' => 10, 'essence-of-water' => 4]]])->save();

        // No Right Binding
        $this->actingAs($user)->postJson(route('craft'), ['recipe' => 'thunderfury', 'count' => 1, 'side' => 'alliance'])->assertStatus(422);
        $this->postJson(route('craft'), ['recipe' => 'thunderfury', 'count' => 2, 'side' => 'alliance'])->assertStatus(422);
        $this->assertArrayNotHasKey('thunderfury', Gear::owned($user->fresh(), 'alliance'));
    }

    public function test_for_now_no_boss_drops_a_binding(): void
    {
        $user = User::factory()->create();
        foreach (['khan-dezhepah', 'chief-ukorz-sandscalp', 'vile-priestess-hexx'] as $bossId) {
            $this->assertSame([], BossLoot::rollBindings($user, BossLoot::boss($bossId)));
        }
    }

    // When they drop (3% of the time, from the last two bosses)
    public function test_the_last_bosses_drop_the_bindings_into_the_hunter_s_bank(): void
    {
        config(['boss_loot.bindings.chance' => 1]);
        $user = User::factory()->create();
        $khan = BossLoot::boss('khan-dezhepah');
        $this->assertSame(9, $khan['zone']);

        // The Left from the ninth zone's boss, the Right from the tenth's
        $this->assertSame([self::LEFT], BossLoot::rollBindings($user, $khan));
        $this->assertSame([self::RIGHT], BossLoot::rollBindings($user, BossLoot::boss('chief-ukorz-sandscalp')));
        // Not from an early boss, nor for a guest
        $this->assertSame([], BossLoot::rollBindings($user, BossLoot::boss('sarkoth')));
        $this->assertSame([], BossLoot::rollBindings(null, $khan));

        // Through a fight: into the Horde hunter's bank, said in the answer
        Grants::beatBosses($user, 'horde', 9);
        $user->forceFill(['coins' => 1000000])->save();
        $token = $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'horde', 'mode' => 'boss_fight', 'startZone' => 9])->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $this->travel(2)->minutes();
        $this->postJson(route('games.boss', $game), ['boss' => 'khan-dezhepah'])->assertOk()
            ->assertJsonCount(1, 'bindings')
            ->assertJsonPath('bindings.0.name', 'Left Binding of the Windseeker');
        $this->assertSame([self::LEFT => 1], array_intersect_key(Bags::bank($user->fresh(), 'horde'), [self::LEFT => 1, self::RIGHT => 1]));
        $this->assertSame([], Bags::bank($user->fresh(), 'alliance'));

        // Bound to him: never sent to the other hunter
        $this->postJson(route('bags.send'), ['item' => self::LEFT, 'count' => 1, 'side' => 'horde'])->assertStatus(422);
        $this->assertSame(1, Bags::bank($user->fresh(), 'horde')[self::LEFT]);

        // One of each to a hunter: none while he has them, none once the blade is made
        $this->assertSame([], BossLoot::rollBindings($user->fresh(), $khan));
        $maker = $this->hunterWithEverything();
        Bags::craft($maker, 'horde', 'thunderfury', 1);
        $this->assertSame([], BossLoot::rollBindings($maker->fresh(), $khan));
    }
}
