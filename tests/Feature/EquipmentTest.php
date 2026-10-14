<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Gear;
use App\Support\Grants;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EquipmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_player_wears_what_they_own_where_it_fits(): void
    {
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');
        Grants::giveSet($user, 'cryptstalker');

        $this->actingAs($user)->putJson(route('equipment.update'), ['equipment' => [
            'head' => 'giantstalker-helmet',
            'chest' => 'cryptstalker-chest',
            'finger2' => 'cryptstalker-ring',
            // What cannot be worn is left out, not refused
            'feet' => 'giantstalker-helmet',   // already on the head, and it is no boot
            'legs' => 'ds_legs',               // not theirs
            'finger1' => 'cryptstalker-ring',  // the same ring twice: the first finger has it
            'nose' => 'giantstalker-belt',     // no such slot
            'neck' => 'giantstalker-belt',     // a belt is not a necklace
        ]])->assertOk()->assertJsonPath('equipment', [
            'head' => 'giantstalker-helmet',
            'chest' => 'cryptstalker-chest',
            'finger1' => 'cryptstalker-ring',
        ]);

        // The Alliance hunter's (the side said or not); the Horde hunter's is still unchosen
        $this->assertSame(
            ['alliance' => ['head' => 'giantstalker-helmet', 'chest' => 'cryptstalker-chest', 'finger1' => 'cryptstalker-ring'], 'horde' => null],
            $user->fresh()->equipment
        );

        // The game is handed both with its page
        $this->get(route('play'))->assertSee('"equipment":{"alliance":{"head":"giantstalker-helmet","chest":"cryptstalker-chest","finger1":"cryptstalker-ring"},"horde":null}', false);

        // The Horde hunter dressed apart
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => ['chest' => 'giantstalker-chest']])->assertOk();
        $this->assertSame(['chest' => 'giantstalker-chest'], $user->fresh()->equipment['horde']);
        $this->assertSame('cryptstalker-chest', $user->fresh()->equipment['alliance']['chest']);

        // Everything taken off: remembered as a choice, not as never having chosen
        $this->putJson(route('equipment.update'), ['equipment' => []])->assertOk();
        $this->assertSame([], $user->fresh()->equipment['alliance']);
        $this->get(route('play'))->assertSee('"equipment":{"alliance":{},"horde":{"chest":"giantstalker-chest"}}', false);
    }

    public function test_a_piece_taken_back_is_no_longer_worn(): void
    {
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');
        $user->forceFill(['equipment' => ['head' => 'giantstalker-helmet']])->save();

        Grants::takeBackSet($user->fresh(), 'giantstalker');

        // (an outfit saved before each hunter had his own: both wear it, in their own clothes
        // where it left a slot empty)
        $page = $this->actingAs($user->fresh())->get(route('play'));
        $page->assertDontSee('"head":"giantstalker-helmet"', false);
        $page->assertSee('"alliance":{"chest":"starter-alliance-pajama-top"', false);
        $page->assertSee('"quiver":"starter-alliance-quiver"', false);
        $page->assertSee('"horde":{"neck":"starter-horde-bone-amulet"', false);
    }

    public function test_a_player_who_has_never_chosen_is_told_apart(): void
    {
        $this->actingAs(User::factory()->create())->get(route('play'))->assertSee('"equipment":{"alliance":null,"horde":null}', false);
    }

    public function test_the_large_quiver_is_the_hunters_whose_boss_dropped_it_and_worn_in_the_quiver_slot(): void
    {
        $user = User::factory()->create();
        $this->assertArrayNotHasKey(Gear::LARGE_QUIVER, Gear::owned($user, 'alliance'));

        // Dropped by a Horde boss: the Horde hunter's, and only his
        $user->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'x', 'rarity' => 'uncommon', 'quiver' => true, 'dropped_at' => now()]);
        $user->forceFill(['quiver' => true])->save();
        $this->assertSame(['horde'], Gear::quiverSides($user->fresh()));
        $this->assertSame(1, Gear::owned($user->fresh(), 'horde')[Gear::LARGE_QUIVER]);
        $this->assertArrayNotHasKey(Gear::LARGE_QUIVER, Gear::owned($user->fresh(), 'alliance'));
        $this->assertSame(4, Gear::catalog()[Gear::LARGE_QUIVER]['quiverSlots']);

        // The Alliance hunter may still find his own; the Horde hunter no second one
        $this->assertFalse(\App\Support\BossLoot::rollQuiver($user->fresh(), 'horde'));

        $this->actingAs($user->fresh())->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => ['quiver' => Gear::LARGE_QUIVER]])
            ->assertOk()->assertJsonPath('equipment.quiver', Gear::LARGE_QUIVER);
        $this->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => ['quiver' => Gear::LARGE_QUIVER]])
            ->assertOk()->assertJsonMissingPath('equipment.quiver');
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => ['back' => Gear::LARGE_QUIVER]])
            ->assertOk()->assertJsonMissingPath('equipment.back');

        // One given by the admin before quivers dropped by side: the Alliance hunter's
        $given = User::factory()->create(['quiver' => true]);
        $this->assertSame(['alliance'], Gear::quiverSides($given));
    }

    public function test_a_quiver_saved_on_the_back_is_in_the_quiver_slot_now(): void
    {
        $this->assertSame(['head' => 'x', 'quiver' => 'starter-alliance-quiver'], Gear::quiverMoved(['head' => 'x', 'back' => 'starter-alliance-quiver']));
        // A quiver slot that has one already keeps it
        $this->assertSame(['quiver' => Gear::LARGE_QUIVER], Gear::quiverMoved(['back' => 'starter-alliance-quiver', 'quiver' => Gear::LARGE_QUIVER]));
        // A cape on the back stays there
        $this->assertSame(['back' => 'miners-cape'], Gear::quiverMoved(['back' => 'miners-cape']));
    }

    public function test_the_clothes_a_hunter_starts_in_are_his_and_not_carried_or_sold(): void
    {
        $user = User::factory()->create();
        $owned = Gear::owned($user);
        foreach (array_merge(Gear::starterLoadout('alliance'), Gear::starterLoadout('horde')) as $itemId) {
            $this->assertSame(1, $owned[$itemId], $itemId);
        }

        // Worn without counting towards the carried: none of it is in the list
        $response = $this->actingAs($user)->putJson(route('equipment.update'), ['equipment' => Gear::starterLoadout('alliance'), 'carried' => []])
            ->assertOk();
        $this->assertEquals(Gear::starterLoadout('alliance'), $response->json('equipment'));
        $this->assertSame([], $response->json('carried'));

        // Never for sale
        $user->forceFill(['email_verified_at' => now()])->save();
        $this->postJson(route('vendor.sell'), ['item' => 'starter-alliance-bow', 'count' => 1])->assertStatus(422);
    }

    public function test_each_hunter_wears_only_his_own_sides_loot_and_clothes(): void
    {
        $user = User::factory()->create();
        $user->bossDrops()->create(['boss_id' => 'garrick-padfoot', 'item_id' => 'garricks-red-bandana', 'rarity' => 'uncommon', 'dropped_at' => now()]);
        $user->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'scorpid-stinger', 'rarity' => 'uncommon', 'dropped_at' => now()]);

        $this->assertSame('alliance', Gear::catalog()['garricks-red-bandana']['side']);
        $this->assertSame('horde', Gear::catalog()['starter-horde-bone-amulet']['side']);

        // The Horde's loot and clothes are left out of the Alliance hunter's outfit, and the other way round
        $mixed = ['head' => 'garricks-red-bandana', 'offhand' => 'scorpid-stinger', 'neck' => 'starter-horde-bone-amulet'];
        $this->actingAs($user)->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => $mixed])
            ->assertOk()->assertJsonPath('equipment', ['head' => 'garricks-red-bandana']);
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => $mixed])
            ->assertOk()->assertJsonPath('equipment', ['neck' => 'starter-horde-bone-amulet', 'offhand' => 'scorpid-stinger']);

        // Both are still owned
        $this->assertArrayHasKey('scorpid-stinger', Gear::owned($user));
        $this->assertArrayHasKey('garricks-red-bandana', Gear::owned($user));
    }

    public function test_gear_that_binds_when_worn_can_be_sent_to_the_other_hunter_until_it_is_worn(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $alliance = \App\Models\Game::create(['token' => 'b1', 'user_id' => $user->id, 'name' => 'A', 'faction' => 'alliance', 'status' => \App\Models\Game::FINISHED, 'started_at' => now()]);
        foreach ([3, 4, 5] as $at) {
            $alliance->drops()->create(['item_id' => 'miners-cape', 'chunk' => 0, 'at_seconds' => $at, 'claimed_at' => now()]);
        }
        $this->assertSame('equip', Gear::binding('miners-cape'));
        $this->assertSame('pickup', Gear::binding('cape-of-the-brotherhood'));
        $this->assertSame(3, Gear::sendable($user, 'alliance', 'miners-cape'));

        // He wears one: that copy is his for good, the other two can still go
        $this->actingAs($user)->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => ['back' => 'miners-cape']])->assertOk();
        $this->assertSame(1, Gear::bound($user->fresh(), 'alliance')['miners-cape']);
        $this->assertSame(2, Gear::sendable($user->fresh(), 'alliance', 'miners-cape'));

        $this->postJson(route('gear.send'), ['item' => 'miners-cape', 'count' => 3, 'side' => 'alliance'])->assertStatus(422);
        $this->postJson(route('gear.send'), ['item' => 'miners-cape', 'count' => 2, 'side' => 'alliance'])
            ->assertOk()->assertJsonPath('gear.alliance.miners-cape', 1)->assertJsonPath('gear.horde.miners-cape', 2);
        // Still wearing his own
        $this->assertSame('miners-cape', Gear::worn($user->fresh(), 'alliance')['back']);

        // Sent copies are unbound for the Horde hunter until he wears one
        $this->assertSame(2, Gear::sendable($user->fresh(), 'horde', 'miners-cape'));
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => ['back' => 'miners-cape']])->assertOk();
        $this->assertSame(1, Gear::sendable($user->fresh(), 'horde', 'miners-cape'));
        // ...and one goes back
        $this->postJson(route('gear.send'), ['item' => 'miners-cape', 'count' => 1, 'side' => 'horde'])
            ->assertOk()->assertJsonPath('gear.alliance.miners-cape', 2)->assertJsonPath('gear.horde.miners-cape', 1);

        // Bound when picked up: boss loot never goes
        $user->bossDrops()->create(['boss_id' => 'edwin-vancleef', 'item_id' => 'cape-of-the-brotherhood', 'rarity' => 'rare', 'dropped_at' => now()]);
        $this->postJson(route('gear.send'), ['item' => 'cape-of-the-brotherhood', 'count' => 1, 'side' => 'alliance'])->assertStatus(422);
        $this->get(route('play'))->assertSee('"bound":{"alliance":{', false);
    }

    public function test_each_hunter_owns_what_he_won_and_sells_only_that(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $horde = \App\Models\Game::create(['token' => 'h1', 'user_id' => $user->id, 'name' => 'A', 'faction' => 'horde', 'status' => \App\Models\Game::FINISHED, 'started_at' => now()]);
        $horde->drops()->create(['item_id' => 'giantstalker-helmet', 'chunk' => 0, 'at_seconds' => 3, 'claimed_at' => now()]);
        $horde->drops()->create(['item_id' => 'ring1', 'chunk' => 0, 'at_seconds' => 4, 'claimed_at' => now()]);
        $alliance = \App\Models\Game::create(['token' => 'a1', 'user_id' => $user->id, 'name' => 'A', 'faction' => 'alliance', 'status' => \App\Models\Game::FINISHED, 'started_at' => now()]);
        $alliance->drops()->create(['item_id' => 'ring1', 'chunk' => 0, 'at_seconds' => 4, 'claimed_at' => now()]);
        $alliance->drops()->create(['item_id' => 'ring1', 'chunk' => 0, 'at_seconds' => 5, 'claimed_at' => now()]);

        // The set piece is the Horde hunter's only; each has his own rings
        $this->assertSame(['giantstalker-helmet'], $user->setPieces('horde'));
        $this->assertSame([], $user->setPieces('alliance'));
        $this->assertSame(1, Gear::owned($user, 'horde')['ring1']);
        $this->assertSame(2, Gear::owned($user, 'alliance')['ring1']);
        $this->assertArrayNotHasKey('starter-alliance-bow', Gear::owned($user, 'horde'));

        // The Alliance hunter cannot wear the Horde hunter's helmet
        $this->actingAs($user)->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => ['head' => 'giantstalker-helmet']])
            ->assertOk()->assertJsonPath('equipment', []);

        // Sold by one hunter, the other's are untouched
        $this->postJson(route('vendor.sell'), ['item' => 'ring1', 'count' => 5, 'side' => 'alliance'])->assertOk()
            ->assertJsonPath('sold', 2)->assertJsonPath('side', 'alliance')->assertJsonMissingPath('gear.ring1');
        $this->assertSame(1, Gear::owned($user->fresh(), 'horde')['ring1']);

        // What was sold before each hunter had his own: the Alliance hunter's first, then the Horde's
        $user->forceFill(['sold' => ['ring1' => 3]])->save();
        $this->assertArrayNotHasKey('ring1', Gear::owned($user->fresh(), 'alliance'));
        $this->assertArrayNotHasKey('ring1', Gear::owned($user->fresh(), 'horde'));
        $user->forceFill(['sold' => ['ring1' => 2]])->save();
        $this->assertSame(1, Gear::owned($user->fresh(), 'horde')['ring1']);
    }

    public function test_it_is_for_logged_in_players(): void
    {
        $this->putJson(route('equipment.update'), ['equipment' => []])->assertUnauthorized();
    }

    public function test_every_set_piece_has_its_slot_and_it_is_the_one_the_game_gives_it(): void
    {
        $slots = Gear::slots();
        $this->assertEqualsCanonicalizing(
            array_merge(config('loot.items.set_piece'), array_keys(Gear::catalog())),
            array_keys($slots)
        );

        // The game's own word for where a piece is worn, and the sheet's slots for that word
        $inGame = ['head' => ['head'], 'shoulders' => ['shoulder'], 'chest' => ['chest'], 'bracers' => ['wrist'], 'hands' => ['hands'],
            'belt' => ['waist'], 'legs' => ['legs'], 'boots' => ['feet'], 'ring' => ['finger1', 'finger2']];
        preg_match_all('/id: "([^"]+)"[^\n]*type: "set_piece", set: "\w+", slot: "(\w+)"/', file_get_contents(base_path('game/data/gameItems.js')), $pieces, PREG_SET_ORDER);

        $this->assertCount(25, $pieces);
        foreach ($pieces as [, $itemId, $slot]) {
            $this->assertSame($inGame[$slot], $slots[$itemId], "$itemId is worn somewhere else in the game");
        }

        // And the sheet's slots are the game's
        preg_match_all("/\{ id: '(\w+)', label:/", file_get_contents(base_path('game/utils/gear.js')), $sheet);
        $this->assertSame(Gear::SLOTS, $sheet[1]);
    }

    public function test_a_hunter_takes_only_so_much_gear_into_a_game(): void
    {
        config(['gear.carry' => 10]);
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');   // 8 pieces
        Grants::giveSet($user, 'cryptstalker');   // 9 pieces

        // Never chosen: nothing is kept, and the game is told so
        $this->actingAs($user)->putJson(route('equipment.update'), ['equipment' => ['head' => 'cryptstalker-helmet']])
            ->assertOk()->assertJsonCount(10, 'carried')->assertJsonPath('carried.0', 'cryptstalker-helmet');
        $this->assertNull($user->fresh()->carried);
        $this->get(route('play'))->assertSee('"carried":null', false);

        // Chosen: what is theirs, once each, and no more than the limit
        $pieces = config('loot.sets.giantstalker.pieces');
        $this->putJson(route('equipment.update'), [
            'equipment' => ['head' => 'cryptstalker-helmet'],
            'carried' => ['cryptstalker-helmet', 'cryptstalker-chest', 'cryptstalker-chest', 'ds_legs', ...array_values($pieces), 'cryptstalker-boots'],
        ])->assertOk()->assertJsonPath('carried', ['cryptstalker-helmet', 'cryptstalker-chest', ...array_values($pieces)]);
        $this->assertCount(10, $user->fresh()->carried['alliance']);

        // What is not carried cannot be worn
        $this->putJson(route('equipment.update'), ['equipment' => ['head' => 'cryptstalker-helmet', 'feet' => 'cryptstalker-boots']])
            ->assertOk()->assertJsonPath('equipment', ['head' => 'cryptstalker-helmet']);

        // With room, what is put on is carried
        $this->putJson(route('equipment.update'), [
            'equipment' => ['feet' => 'cryptstalker-boots'],
            'carried' => ['cryptstalker-helmet'],
        ])->assertOk()->assertJsonPath('carried', ['cryptstalker-helmet', 'cryptstalker-boots'])
            ->assertJsonPath('equipment', ['feet' => 'cryptstalker-boots']);

        $this->get(route('play'))->assertSee('"carried":{"alliance":["cryptstalker-helmet","cryptstalker-boots"],"horde":null}', false);
    }

    public function test_each_hunter_carries_his_own(): void
    {
        config(['gear.carry' => 3]);
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');
        $user->bossDrops()->create(['boss_id' => 'garrick-padfoot', 'item_id' => 'garricks-red-bandana', 'rarity' => 'uncommon', 'dropped_at' => now()]);
        $user->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'scorpid-stinger', 'rarity' => 'uncommon', 'dropped_at' => now()]);

        // A list saved before each hunter had his own is both's, less the other side's loot
        $user->forceFill(['carried' => ['garricks-red-bandana', 'scorpid-stinger', 'giantstalker-helmet']])->save();
        $this->actingAs($user)->get(route('play'))->assertSee(
            '"carried":{"alliance":["garricks-red-bandana","giantstalker-helmet"],"horde":["scorpid-stinger","giantstalker-helmet"]}', false
        );

        // Each chooses his own, from his own and what either can wear
        $this->putJson(route('equipment.update'), ['side' => 'horde', 'equipment' => [], 'carried' => ['scorpid-stinger', 'garricks-red-bandana', 'giantstalker-boots', 'giantstalker-belt']])
            ->assertOk()->assertJsonPath('carried', ['scorpid-stinger', 'giantstalker-boots', 'giantstalker-belt']);
        $this->putJson(route('equipment.update'), ['side' => 'alliance', 'equipment' => [], 'carried' => ['giantstalker-helmet']])
            ->assertOk()->assertJsonPath('carried', ['giantstalker-helmet']);
        $this->assertSame(
            ['alliance' => ['giantstalker-helmet'], 'horde' => ['scorpid-stinger', 'giantstalker-boots', 'giantstalker-belt']],
            $user->fresh()->carried
        );
    }

    public function test_the_game_and_the_site_agree_on_how_much_is_carried(): void
    {
        $config = file_get_contents(base_path('game/config/gameConfig.js'));

        $this->assertSame(1, preg_match('/carry: (\d+),/', $config, $found));
        $this->assertSame((int) $found[1], config('gear.carry'));
    }

    public function test_each_hunter_keeps_sets_of_his_own(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->putJson(route('outfits.update'), ['side' => 'alliance', 'outfits' => [
            ['name' => ' Boss gear ', 'equipment' => ['head' => 'giantstalker-helmet', 'mainhand' => 'ashkandi2', 'nose' => 'x', 'feet' => '']],
            ['name' => 'Empty', 'equipment' => []],
        ]])->assertOk()->assertJsonPath('outfits.alliance.0.name', 'Boss gear')
            ->assertJsonPath('outfits.alliance.0.equipment', ['head' => 'giantstalker-helmet', 'mainhand' => 'ashkandi2'])
            ->assertJsonPath('outfits.horde', []);

        // The Horde hunter's are his own: saving them leaves the Alliance hunter's as they are
        $this->putJson(route('outfits.update'), ['side' => 'horde', 'outfits' => [['name' => 'Totem', 'equipment' => ['ranged' => 'starter-horde-totem']]]])
            ->assertOk()->assertJsonPath('outfits.horde.0.name', 'Totem')
            ->assertJsonPath('outfits.alliance.1.name', 'Empty');
        $this->assertCount(2, Gear::allOutfits($user->fresh())['alliance']);
        $this->get(route('play'))->assertSee('"outfits":{"alliance":[{"name":"Boss gear"', false);

        // Saved again into one (the game sends the hunter's whole list, the set changed in it)
        $this->putJson(route('outfits.update'), ['side' => 'alliance', 'outfits' => [
            ['name' => 'Boss gear', 'equipment' => ['head' => 'cryptstalker-helmet']],
            ['name' => 'Empty', 'equipment' => []],
        ]])->assertOk()->assertJsonPath('outfits.alliance.0.equipment', ['head' => 'cryptstalker-helmet']);

        // No more than four for a hunter, each named, and for a side there is
        $five = array_fill(0, 5, ['name' => 'Set', 'equipment' => []]);
        $this->putJson(route('outfits.update'), ['side' => 'horde', 'outfits' => $five])->assertStatus(422);
        $this->putJson(route('outfits.update'), ['side' => 'horde', 'outfits' => [['equipment' => []]]])->assertStatus(422);
        $this->putJson(route('outfits.update'), ['side' => 'goblin', 'outfits' => []])->assertStatus(422);
        $this->putJson(route('outfits.update'), ['outfits' => []])->assertStatus(422);

        auth()->logout();
        $this->putJson(route('outfits.update'), ['side' => 'alliance', 'outfits' => []])->assertUnauthorized();
    }

    public function test_sets_saved_before_each_hunter_had_his_own_are_the_alliance_hunters(): void
    {
        $user = User::factory()->create(['outfits' => [['name' => 'Old', 'equipment' => ['head' => 'giantstalker-helmet']]]]);

        $this->assertSame(['alliance' => [['name' => 'Old', 'equipment' => ['head' => 'giantstalker-helmet']]], 'horde' => []], Gear::allOutfits($user));

        // Saving the Horde hunter's keeps them the Alliance hunter's
        $this->actingAs($user)->putJson(route('outfits.update'), ['side' => 'horde', 'outfits' => [['name' => 'New', 'equipment' => []]]])
            ->assertOk()->assertJsonPath('outfits.alliance.0.name', 'Old');
    }
}
