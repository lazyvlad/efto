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

    public function test_junk_is_sold_and_materials_stay_in_the_bags(): void
    {
        $user = User::factory()->create();

        // Bread is a regular item (10c), a gold coin a green one (25c); runecloth and thorium
        // bars are materials, worth as much but kept
        $this->play(['bread' => 4, 'gold-coin' => 2, 'runecloth' => 3, 'thorium-bar' => 1], [], $user)
            ->assertJsonPath('coins.earned', 4 * 10 + 2 * 25)
            ->assertJsonPath('materials.kept.runecloth', 3)
            ->assertJsonPath('bags.thorium-bar', 1);

        // In the bags, not the bank, from one game to the next
        $this->assertEquals(['runecloth' => 3, 'thorium-bar' => 1], Bags::contents($user->fresh(), 'alliance'));
        $this->assertSame([], Bags::contents($user->fresh(), 'horde'));
        $this->assertSame([], Bags::bank($user->fresh(), 'alliance'));
        $this->assertSame(90, $user->fresh()->coins);

        // The next game adds to what is there
        $this->play(['runecloth' => 2], [], $user)->assertJsonPath('bags.runecloth', 5);
    }

    public function test_what_is_in_the_bags_takes_room_from_what_a_game_catches(): void
    {
        $user = User::factory()->create();
        // Fifteen of the sixteen slots taken by materials kept from before
        $user->forceFill(['bag_contents' => ['runecloth' => 15 * 20]])->save();

        // Two more kinds said to fit: more than the one free slot holds, so none of it is believed
        $response = $this->play(['bread' => 1, 'fish' => 1], [], $user);
        $this->assertSame(2 * 9, $response->json('coins.earned'));
        $response->assertJsonPath('bags.runecloth', 300);

        // One fits
        $this->play(['kingsblood' => 3], [], $user)->assertJsonPath('bags.kingsblood', 3);
    }

    public function test_materials_move_between_the_bank_and_the_bags_as_far_as_there_is_room(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['materials' => ['kingsblood' => 30, 'runecloth' => 400], 'bag_contents' => ['essence-of-water' => 5]])->save();

        $this->actingAs($user)->postJson(route('bags.move'), ['item' => 'kingsblood', 'count' => 25, 'to' => 'bags'])
            ->assertOk()->assertJsonPath('bags.kingsblood', 25)->assertJsonPath('bank.kingsblood', 5);

        // More than the bank has, more than the bags hold (16 slots: 2 taken, 14 left = 280)
        $this->postJson(route('bags.move'), ['item' => 'kingsblood', 'count' => 6, 'to' => 'bags'])->assertStatus(422);
        $this->postJson(route('bags.move'), ['item' => 'runecloth', 'count' => 300, 'to' => 'bags'])->assertStatus(422);
        $this->postJson(route('bags.move'), ['item' => 'runecloth', 'count' => 260, 'to' => 'bags'])->assertOk();

        // And back
        $this->postJson(route('bags.move'), ['item' => 'essence-of-water', 'count' => 5, 'to' => 'bank'])
            ->assertOk()->assertJsonPath('bank.essence-of-water', 5)->assertJsonMissingPath('bags.essence-of-water');

        // Only materials and what is crafted are kept: not junk, not gear
        $this->postJson(route('bags.move'), ['item' => 'bread', 'count' => 1, 'to' => 'bags'])->assertStatus(422);

        auth()->logout();
        $this->postJson(route('bags.move'), ['item' => 'kingsblood', 'count' => 1, 'to' => 'bags'])->assertUnauthorized();
    }

    public function test_potions_are_crafted_from_what_is_in_the_bags_and_drunk_in_a_game(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['materials' => ['kingsblood' => 50], 'bag_contents' => ['kingsblood' => 7, 'essence-of-water' => 5]])->save();

        // Five potions take five of each; a sixth has no water left
        $this->actingAs($user)->postJson(route('craft'), ['recipe' => 'health-potion', 'count' => 6])->assertStatus(422);
        $this->postJson(route('craft'), ['recipe' => 'health-potion', 'count' => 5])
            ->assertOk()->assertJsonPath('bags.health-potion', 5)->assertJsonPath('bags.kingsblood', 2)
            ->assertJsonMissingPath('bags.essence-of-water')
            // What is in the bank is not used
            ->assertJsonPath('bank.kingsblood', 50);
        $this->postJson(route('craft'), ['recipe' => 'mana-potion', 'count' => 1])->assertStatus(422);

        // Two drunk in a game, and no more than there were said to be
        $this->play([], [], $user)->assertJsonPath('bags.health-potion', 5);
        $token = $this->postJson(route('games.open'), ['name' => 'Bob', 'faction' => 'alliance'])->json('game');
        $this->travel(60)->seconds();
        $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => 50, 'used' => ['health-potion' => 2, 'bread' => 3]])
            ->assertOk()->assertJsonPath('bags.health-potion', 3);
        $token = $this->postJson(route('games.open'), ['name' => 'Bob', 'faction' => 'alliance'])->json('game');
        $this->travel(60)->seconds();
        $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => 50, 'used' => ['health-potion' => 9]])
            ->assertOk()->assertJsonMissingPath('bags.health-potion');
    }

    public function test_a_game_keeps_potions_and_spare_arrows_in_the_bags_as_far_as_time_and_room_allow(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Ten minutes: up to 40 potions of a kind and 3000 arrows believed. Arrows stack 200 to a slot.
        $finish = function (int $seconds, array $body) {
            $token = $this->postJson(route('games.open'), ['name' => 'Bob', 'faction' => 'alliance'])->json('game');
            $this->travel($seconds + 10)->seconds();

            return $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => $seconds] + $body)->assertOk();
        };
        $finish(600, ['stored' => ['health-potion' => 3, 'mana-potion' => 99, 'arrows' => 450, 'bread' => 5]])
            ->assertJsonPath('bags.health-potion', 3)
            ->assertJsonPath('bags.mana-potion', 40)
            ->assertJsonPath('bags.arrows', 450)
            ->assertJsonMissingPath('bags.bread');
        // One slot of health potions, two of mana potions (20 to a slot), three of arrows
        $this->assertSame(1 + 2 + 3, Bags::slotsUsed(Bags::contents($user->fresh(), 'alliance')));

        // Arrows shot from the bags and a potion drunk, and what fits of more than the room left
        $finish(600, ['used' => ['arrows' => 400, 'health-potion' => 1], 'stored' => ['arrows' => 2000]])
            ->assertJsonPath('bags.health-potion', 2)
            // 16 slots: potions take 1 + 2, so 13 for arrows, 2600 at most
            ->assertJsonPath('bags.arrows', 50 + 2000);
        $finish(600, ['stored' => ['arrows' => 3000]])->assertJsonPath('bags.arrows', 2600);
    }

    public function test_each_hunter_has_his_own_bags_and_bank_and_sends_the_other_what_he_likes(): void
    {
        $user = User::factory()->create();
        // Kept before each hunter had his own: the Alliance hunter's
        $user->forceFill(['materials' => ['kingsblood' => 30], 'bag_contents' => ['runecloth' => 5]])->save();
        $this->assertSame(['kingsblood' => 30], Bags::bank($user, 'alliance'));
        $this->assertSame([], Bags::bank($user, 'horde'));

        // A Horde game keeps what it brings in the Horde hunter's bags
        $this->actingAs($user);
        $token = $this->postJson(route('games.open'), ['name' => 'Bob', 'faction' => 'horde'])->json('game');
        $this->travel(600)->seconds();
        $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => 590, 'items' => ['fadeleaf' => 4]])
            ->assertOk()->assertJsonPath('bags.fadeleaf', 4)->assertJsonMissingPath('bags.runecloth');
        $this->assertSame(['runecloth' => 5], Bags::contents($user->fresh(), 'alliance'));

        // The Horde hunter has no kingsblood of his own to move; the Alliance hunter sends him ten
        $this->postJson(route('bags.move'), ['item' => 'kingsblood', 'count' => 1, 'to' => 'bags', 'side' => 'horde'])->assertStatus(422);
        $this->postJson(route('bags.send'), ['item' => 'kingsblood', 'count' => 10, 'side' => 'alliance'])
            ->assertOk()->assertJsonPath('bank.kingsblood', 20)->assertJsonPath('all.bank.horde.kingsblood', 10);
        $this->postJson(route('bags.move'), ['item' => 'kingsblood', 'count' => 10, 'to' => 'bags', 'side' => 'horde'])
            ->assertOk()->assertJsonPath('bags.kingsblood', 10)->assertJsonPath('bags.fadeleaf', 4);

        // No more than he has, and only what is kept (no gear, no junk)
        $this->postJson(route('bags.send'), ['item' => 'kingsblood', 'count' => 21, 'side' => 'alliance'])->assertStatus(422);
        $this->postJson(route('bags.send'), ['item' => 'bread', 'count' => 1, 'side' => 'alliance'])->assertStatus(422);
    }

    public function test_arrows_are_made_by_the_bundle_and_haste_potions_one_at_a_time(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['bag_contents' => ['light-feather' => 3, 'rugged-leather' => 2, 'fadeleaf' => 1, 'essence-of-water' => 1]])->save();

        // Two bundles of arrows take two of each and make a hundred, in one slot (arrows stack by 200)
        $this->actingAs($user)->postJson(route('craft'), ['recipe' => 'arrows', 'count' => 3])->assertStatus(422);
        $this->postJson(route('craft'), ['recipe' => 'arrows', 'count' => 2])
            ->assertOk()->assertJsonPath('bags.arrows', 100)->assertJsonPath('bags.light-feather', 1)
            ->assertJsonMissingPath('bags.rugged-leather');
        $this->postJson(route('craft'), ['recipe' => 'haste-potion', 'count' => 1])
            ->assertOk()->assertJsonPath('bags.haste-potion', 1);
        // The game is told how many a making makes
        $this->assertStringContainsString('"makes":{"arrows":50}', $this->get(route('play'))->getContent());
    }

    public function test_materials_are_bought_with_coins_into_the_bank_of_the_hunter_they_are_for(): void
    {
        // Every material has its price, and nothing else is for sale
        $this->assertEqualsCanonicalizing(config('loot.materials'), array_keys(config('loot.material_prices')));

        $user = User::factory()->create();
        $user->forceFill(['coins' => 1000])->save();
        $this->actingAs($user)->postJson(route('materials.buy'), ['item' => 'kingsblood', 'count' => 4, 'side' => 'horde'])
            ->assertOk()->assertJsonPath('coins', 800)->assertJsonPath('bank.kingsblood', 4);
        $this->assertSame([], \App\Support\Bags::bank($user->fresh(), 'alliance'), 'the Alliance hunter has none of it');
        // More than the purse holds: nothing taken, nothing given
        $this->postJson(route('materials.buy'), ['item' => 'black-lotuses', 'count' => 1])->assertStatus(422);
        $this->postJson(route('materials.buy'), ['item' => 'health-potion', 'count' => 1])->assertStatus(422);
        $this->assertSame(800, $user->fresh()->coins);
        // A guest earns coins but cannot spend them
        $guest = User::factory()->create();
        $guest->forceFill(['coins' => 1000, 'is_guest' => true, 'email_verified_at' => null])->save();
        $this->actingAs($guest)->postJson(route('materials.buy'), ['item' => 'kingsblood', 'count' => 1])->assertStatus(422);
        // The game is told the prices
        $this->actingAs($user)->assertStringContainsString('"materialPrices":{"runecloth":50', $this->get(route('play'))->getContent());
    }

    public function test_what_is_crafted_needs_room_in_the_bags(): void
    {
        $user = User::factory()->create();
        // Every slot taken, the last two by the reagents: two potions free one of them
        $user->forceFill(['bag_contents' => ['runecloth' => 14 * 20, 'kingsblood' => 1, 'essence-of-water' => 1]])->save();
        $this->actingAs($user)->postJson(route('craft'), ['recipe' => 'health-potion', 'count' => 1])->assertOk();

        $user->forceFill(['bag_contents' => ['runecloth' => 14 * 20, 'kingsblood' => 2, 'essence-of-water' => 20]])->save();
        // One potion leaves the water's slot taken and needs a slot of its own
        $this->postJson(route('craft'), ['recipe' => 'health-potion', 'count' => 1])->assertStatus(422);
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
