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
        ]])->assertOk()->assertExactJson(['equipment' => [
            'head' => 'giantstalker-helmet',
            'chest' => 'cryptstalker-chest',
            'finger1' => 'cryptstalker-ring',
        ]]);

        $this->assertSame(
            ['head' => 'giantstalker-helmet', 'chest' => 'cryptstalker-chest', 'finger1' => 'cryptstalker-ring'],
            $user->fresh()->equipment
        );

        // The game is handed it with its page
        $this->get(route('play'))->assertSee('"equipment":{"head":"giantstalker-helmet","chest":"cryptstalker-chest","finger1":"cryptstalker-ring"}', false);

        // Everything taken off: remembered as a choice, not as never having chosen
        $this->putJson(route('equipment.update'), ['equipment' => []])->assertOk();
        $this->assertSame([], $user->fresh()->equipment);
        $this->get(route('play'))->assertSee('"equipment":{}', false);
    }

    public function test_a_piece_taken_back_is_no_longer_worn(): void
    {
        $user = User::factory()->create();
        Grants::giveSet($user, 'giantstalker');
        $user->forceFill(['equipment' => ['head' => 'giantstalker-helmet']])->save();

        Grants::takeBackSet($user->fresh(), 'giantstalker');

        $this->actingAs($user->fresh())->get(route('play'))->assertSee('"equipment":{}', false);
    }

    public function test_a_player_who_has_never_chosen_is_told_apart(): void
    {
        $this->actingAs(User::factory()->create())->get(route('play'))->assertSee('"equipment":null', false);
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
}
