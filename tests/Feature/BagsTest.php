<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\Bags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BagsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Play a game of ten minutes (long enough for everything reported to be believed) and
     * hand it in.
     */
    private function play(array $items, array $overflow = [], ?User $user = null)
    {
        if ($user) {
            $this->actingAs($user);
        }

        $token = $this->postJson(route('games.open'), ['name' => 'Bob', 'faction' => 'alliance'])->json('game');
        $this->travel(600)->seconds();

        return $this->postJson(route('games.finish', $token), [
            'score' => 500, 'gameTime' => 590, 'items' => $items, 'overflow' => $overflow,
        ])->assertOk();
    }

    public function test_junk_is_sold_and_materials_are_kept(): void
    {
        $user = User::factory()->create();

        // Bread is a regular item (10c), a gold coin a green one (25c); runecloth and thorium
        // bars are materials, worth as much but kept
        $this->play(['bread' => 4, 'gold-coin' => 2, 'runecloth' => 3, 'thorium-bar' => 1], [], $user)
            ->assertJsonPath('coins.earned', 4 * 10 + 2 * 25)
            ->assertJsonPath('materials.kept.runecloth', 3)
            ->assertJsonPath('materials.bank.thorium-bar', 1);

        $this->assertEquals(['runecloth' => 3, 'thorium-bar' => 1], $user->fresh()->materials);
        $this->assertSame(90, $user->fresh()->coins);

        // The next game adds to what is kept
        $this->play(['runecloth' => 2], [], $user)->assertJsonPath('materials.bank.runecloth', 5);
    }

    public function test_what_did_not_fit_in_the_bags_is_sold_short_and_a_material_is_not_kept(): void
    {
        $user = User::factory()->create();

        $this->play(['bread' => 10, 'runecloth' => 5], ['bread' => 4, 'runecloth' => 2], $user)
            // Six breads at 10c, four at 9c; two runecloth sold at 9c, three kept
            ->assertJsonPath('coins.earned', 6 * 10 + 4 * 9 + 2 * 9)
            ->assertJsonPath('materials.kept.runecloth', 3);

        // No more is short than was caught
        $this->play(['bread' => 2], ['bread' => 50, 'fish' => 9], $user)->assertJsonPath('coins.earned', 2 * 9);
    }

    public function test_the_game_is_not_believed_to_have_carried_more_than_the_bags_hold(): void
    {
        $user = User::factory()->create();

        // Seventeen kinds of thing in a backpack of sixteen slots, and nothing said to be short
        // (gear that is kept, a cape or a ring, takes no room: none of it here)
        $kinds = ['gold', 'fork-knife', 'hard-cheese', 'bread', 'fish', 'swiss-army', 'gizmos', 'copper-coin', 'gold-coin',
            'silver-coin', 'bronze-coin', 'arcane-crystal', 'sapphire-gem', 'pearl-gem', 'light-feather', 'kingsblood', 'runecloth'];
        $this->assertCount(17, $kinds);

        $response = $this->play(array_fill_keys($kinds, 1), [], $user);

        // Everything is paid as sold short, and the materials are not kept
        $response->assertJsonPath('materials.kept', []);
        $this->assertNull($user->fresh()->materials);
        $this->assertSame(11 * 9 + 6 * Bags::soldShort(25), $response->json('coins.earned'));

        // One kind fewer, and it all fits
        $this->play(array_fill_keys(array_slice($kinds, 1), 1), [], $user)->assertJsonPath('materials.kept.runecloth', 1);
    }

    public function test_a_full_stack_takes_a_slot_of_its_own(): void
    {
        $this->assertSame(0, Bags::slotsUsed([]));
        $this->assertSame(2, Bags::slotsUsed(['bread' => 20, 'fish' => 1]));
        $this->assertSame(4, Bags::slotsUsed(['bread' => 41, 'fish' => 20]));
    }

    public function test_bags_are_bought_with_coins_and_make_room(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 260000])->save();
        $this->assertSame(16, Bags::capacity($user));

        $this->actingAs($user)->postJson(route('bags.buy'), ['size' => 6])
            ->assertOk()
            ->assertJsonPath('bags', [6])
            ->assertJsonPath('capacity', 22)
            ->assertJsonPath('coins', 210000);
        $this->postJson(route('bags.buy'), ['size' => 8])->assertOk()->assertJsonPath('capacity', 30)->assertJsonPath('coins', 60000);

        // Not enough for another, and no such size
        $this->postJson(route('bags.buy'), ['size' => 8])->assertStatus(422);
        $this->postJson(route('bags.buy'), ['size' => 7])->assertStatus(422);
        $this->assertSame([8, 6], $user->fresh()->bags);
        $this->assertSame(60000, $user->fresh()->coins);

        // The game is told what the player has and what is for sale
        $this->get(route('play'))->assertSee('"bags":[8,6]', false)->assertSee('"bagsForSale":{"6":50000', false);
    }

    public function test_with_every_slot_taken_a_bigger_bag_replaces_the_smallest(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 1000000, 'bags' => [8, 6, 6, 6]])->save();

        // No use in another of the smallest
        $this->actingAs($user)->postJson(route('bags.buy'), ['size' => 6])->assertStatus(422);
        $this->assertSame(1000000, $user->fresh()->coins);

        $this->postJson(route('bags.buy'), ['size' => 10])->assertOk()->assertJsonPath('bags', [10, 8, 6, 6])->assertJsonPath('capacity', 46);
    }

    public function test_bags_are_for_accounts_that_can_spend(): void
    {
        $this->postJson(route('bags.buy'), ['size' => 6])->assertUnauthorized();

        $user = User::factory()->unverified()->create();
        $user->forceFill(['coins' => 900000])->save();
        $this->actingAs($user)->postJson(route('bags.buy'), ['size' => 6])->assertStatus(422);
    }

    public function test_the_site_and_the_game_agree_on_the_bags_and_the_materials(): void
    {
        $config = file_get_contents(base_path('game/config/gameConfig.js'));
        preg_match('/bags: \{\s*backpack: (\d+),[^\n]*\n\s*bagSlots: (\d+),[^\n]*\n\s*stack: (\d+),[^\n]*\n\s*fullPenalty: ([\d.]+)/', $config, $bags);

        $this->assertSame((int) $bags[1], config('loot.bags.backpack'));
        $this->assertSame((int) $bags[2], config('loot.bags.bag_slots'));
        $this->assertSame((int) $bags[3], config('loot.bags.stack'));
        $this->assertSame((float) $bags[4], config('loot.bags.full_penalty'));

        preg_match_all("/'([a-z0-9-]+)'/", explode(']);', explode('new Set([', file_get_contents(base_path('game/data/materials.js')))[1])[0], $materials);
        $this->assertEqualsCanonicalizing(config('loot.materials'), $materials[1]);
    }
}
