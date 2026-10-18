<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Bags;
use App\Support\Gear;
use App\Support\Grants;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Gear a hunter keeps in his bags besides his 36: a slot of them a piece, room a material
 * could have had (Gear::bagGear).
 */
class BagGearTest extends TestCase
{
    use RefreshDatabase;

    // The arithmetic of these tests is done on a backpack of sixteen slots, as it was when they
    // were written: they are about how the bags work, not how big they are (BackpackTest)
    protected function setUp(): void
    {
        parent::setUp();
        config(['loot.bags.backpack' => 16]);
    }

    private function hunter(): User
    {
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');
        Grants::giveSet($user, 'cryptstalker');

        return $user;
    }

    public function test_he_keeps_gear_in_his_bags_never_what_he_wears_or_carries_or_does_not_have(): void
    {
        $user = $this->hunter();

        $this->actingAs($user)->putJson(route('equipment.update'), [
            'equipment' => ['head' => 'giantstalker-helmet'],
            'carried' => ['giantstalker-helmet', 'giantstalker-boots'],
            'bagged' => ['cryptstalker-boots', 'giantstalker-helmet', 'giantstalker-boots', 'ds_legs', 'cryptstalker-boots', 'cryptstalker-ring'],
        ])->assertOk()->assertJsonPath('bagged', ['cryptstalker-boots', 'cryptstalker-ring']);

        $this->assertSame(['cryptstalker-boots', 'cryptstalker-ring'], Gear::bagGear($user->fresh(), 'alliance'));
        $this->assertSame([], Gear::bagGear($user->fresh(), 'horde'), 'the Horde hunter keeps his own');
        $this->get(route('play'))->assertSee('"bagGear":{"alliance":["cryptstalker-boots","cryptstalker-ring"],"horde":[]}', false);

        // Out of the bags into his 36: the list he carries says so, and the bags let it go
        $this->putJson(route('equipment.update'), [
            'equipment' => ['head' => 'giantstalker-helmet'],
            'carried' => ['giantstalker-helmet', 'cryptstalker-boots'],
            'bagged' => ['cryptstalker-boots', 'cryptstalker-ring'],
        ])->assertOk()->assertJsonPath('bagged', ['cryptstalker-ring'])->assertJsonPath('carried', ['giantstalker-helmet', 'cryptstalker-boots']);
    }

    public function test_a_piece_in_the_bags_takes_a_slot_from_the_materials(): void
    {
        $user = $this->hunter();
        // The backpack's 16 slots: 14 of materials
        $user->forceFill(['bag_contents' => ['alliance' => ['runecloth' => 280]], 'materials' => ['alliance' => ['kingsblood' => 40]]])->save();

        $this->actingAs($user)->putJson(route('equipment.update'), [
            'equipment' => [],
            'carried' => [],
            'bagged' => ['cryptstalker-boots', 'cryptstalker-ring', 'cryptstalker-belt'],
        ])->assertOk()->assertJsonPath('bagged', ['cryptstalker-boots', 'cryptstalker-ring']);

        $user->refresh();
        $this->assertSame(14, Bags::capacity($user, 'alliance'));
        $this->assertSame(0, Bags::freeSlots($user, 'alliance'));
        $this->assertSame('There is no room for that much in your bags.', Bags::move($user, 'alliance', 'kingsblood', 1, true));
    }

    public function test_caught_gear_goes_into_his_bags_when_his_36_are_full(): void
    {
        $user = $this->hunter();
        config(['gear.carry' => 2]);
        $user->forceFill(['carried' => ['alliance' => ['giantstalker-helmet', 'giantstalker-boots']]])->save();
        Grants::giveSet($user, 'dragonstalker');

        Gear::carryCaught($user->fresh(), 'alliance', ['ds_legs', 'ds_boots']);

        $this->assertSame(['ds_legs', 'ds_boots'], Gear::bagGear($user->fresh(), 'alliance'));
        $this->assertSame(['giantstalker-helmet', 'giantstalker-boots'], Gear::carriedFor($user->fresh(), 'alliance'));
    }
}
