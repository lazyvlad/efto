<?php

namespace Tests\Feature;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\User;
use App\Support\Bags;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GearTest extends TestCase
{
    use RefreshDatabase;

    private function drop(User $user, string $bossId, string $itemId, string $rarity = 'rare'): void
    {
        BossDrop::create(['user_id' => $user->id, 'boss_id' => $bossId, 'item_id' => $itemId, 'rarity' => $rarity, 'dropped_at' => now()]);
    }

    public function test_every_boss_item_can_be_worn_and_is_better_the_later_its_boss(): void
    {
        $catalog = Gear::catalog();
        $slots = Gear::slots();

        foreach (config('boss_loot.bosses') as $bosses) {
            foreach ($bosses as $boss) {
                foreach ($boss['loot'] as $rarity => $item) {
                    $this->assertArrayHasKey($item['id'], $catalog, $item['id'].' has no slot');
                    $this->assertNotEmpty($slots[$item['id']], $item['id'].' is worn nowhere on the sheet');
                    $this->assertNotEmpty($catalog[$item['id']]['stats']);
                    $this->assertGreaterThan(0, $catalog[$item['id']]['value']);
                }
            }
        }
        $starter = count(config('gear.starter.alliance')) + count(config('gear.starter.horde'));
        // ...and the large quiver
        // Boss loot, what falls in a game, the starting clothes, the large quiver, and what is made
        $this->assertCount(60 + count(config('gear.drops')) + $starter + 1 + count(config('gear.crafted')), $catalog);

        // The same kind of thing from an early boss and the last: a one-handed weapon each
        $this->assertSame(['attackPower' => 9, 'crit' => 1], $catalog['cruel-barb']['stats']);
        $this->assertSame(['attackPower' => 16, 'crit' => 1], $catalog['jangthraze-the-protector']['stats']);

        // Rare items help with carrying, more so from later bosses; and so do epic trinkets
        $this->assertSame(1, $catalog['padfoots-throwing-dagger']['stats']['carrying']);
        $this->assertSame(2, $catalog['cape-of-the-brotherhood']['stats']['carrying']);
        $this->assertSame(3, $catalog['ripsaw']['stats']['carrying']);
        $this->assertSame(2, $catalog['nekroshs-head']['stats']['carrying']);
        $this->assertArrayNotHasKey('carrying', $catalog['hoggers-trophy-axe']['stats']);
    }

    public function test_the_weapons_and_jewellery_that_fall_are_items_of_the_game(): void
    {
        foreach (array_keys(config('gear.drops')) as $itemId) {
            $this->assertContains($itemId, array_merge(config('loot.items.epic'), config('loot.items.special'), config('loot.items.regular')), "$itemId does not fall");
        }
    }

    public function test_boss_loot_is_worn_and_the_game_is_told_what_it_is(): void
    {
        $user = User::factory()->create();
        $this->drop($user, 'edwin-vancleef', 'cape-of-the-brotherhood');
        $this->drop($user, 'edwin-vancleef', 'cape-of-the-brotherhood');
        $this->drop($user, 'hogger', 'hoggers-trophy-axe', 'epic');

        $this->assertSame(['cape-of-the-brotherhood' => 2, 'hoggers-trophy-axe' => 1], $this->found($user));

        $this->actingAs($user)->putJson(route('equipment.update'), ['equipment' => [
            'back' => 'cape-of-the-brotherhood',
            'mainhand' => 'hoggers-trophy-axe',
            // An axe is not a cape, and this one is not theirs
            'chest' => 'hoggers-trophy-axe',
            'ranged' => 'centaur-war-spear',
        ]])->assertOk()->assertJsonPath('equipment', ['back' => 'cape-of-the-brotherhood', 'mainhand' => 'hoggers-trophy-axe']);

        $this->get(route('play'))
            ->assertSee('"gear":{"alliance":{"cape-of-the-brotherhood":2,"hoggers-trophy-axe":1,', false)
            ->assertSee('"cape-of-the-brotherhood":{"name":"Cape of the Brotherhood"', false);
    }

    public function test_carrying_eases_what_is_lost_with_the_bags_full(): void
    {
        $this->assertSame(450, Bags::soldShort(500));
        $this->assertSame(460, Bags::soldShort(500, 0.02));
        $this->assertSame(500, Bags::soldShort(500, 0.5));

        $user = User::factory()->create();
        $this->drop($user, 'edwin-vancleef', 'cape-of-the-brotherhood');
        $this->drop($user, 'chief-ukorz-sandscalp', 'ripsaw');
        $this->assertSame(0.0, Gear::carrying($user));

        // Each hunter's by his own side's loot: the cape is the Alliance's, Ripsaw the Horde's
        $user->forceFill(['equipment' => [
            'alliance' => ['back' => 'cape-of-the-brotherhood', 'mainhand' => 'ripsaw'],
            'horde' => ['back' => 'cape-of-the-brotherhood', 'mainhand' => 'ripsaw'],
        ]])->save();
        $this->assertEqualsWithDelta(0.02, Gear::carrying($user->fresh(), 'alliance'), 1e-9);
        $this->assertEqualsWithDelta(0.03, Gear::carrying($user->fresh(), 'horde'), 1e-9);

        // A game with things sold short, with three hundredths of the loss taken off
        $token = $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'horde'])->json('game');
        $this->travel(600)->seconds();
        $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => 590, 'items' => ['gold-coin' => 4], 'overflow' => ['gold-coin' => 4]])
            ->assertJsonPath('coins.earned', 4 * Bags::soldShort(25, 0.03));
    }

    public function test_gear_is_sold_for_coins_and_the_last_one_is_no_longer_worn(): void
    {
        $user = User::factory()->create();
        foreach (range(1, 3) as $time) {
            $this->drop($user, 'edwin-vancleef', 'cape-of-the-brotherhood');
        }
        $user->forceFill(['equipment' => ['back' => 'cape-of-the-brotherhood']])->save();
        $value = Gear::catalog()['cape-of-the-brotherhood']['value'];

        // The spare ones: still worn
        $this->actingAs($user)->postJson(route('vendor.sell'), ['item' => 'cape-of-the-brotherhood', 'count' => 2])
            ->assertOk()
            ->assertJsonPath('sold', 2)
            ->assertJsonPath('coins', 2 * $value)
            ->assertJsonPath('gear.cape-of-the-brotherhood', 1)
            ->assertJsonPath('equipment.alliance.back', 'cape-of-the-brotherhood');

        // The last: gone from the hunter too. Asking to sell more than there are sells what there is.
        $this->postJson(route('vendor.sell'), ['item' => 'cape-of-the-brotherhood', 'count' => 5])
            ->assertOk()
            ->assertJsonPath('sold', 1)
            ->assertJsonPath('coins', 3 * $value)
            ->assertJsonMissingPath('gear.cape-of-the-brotherhood')
            ->assertJsonMissingPath('equipment.alliance.back');
        $this->assertArrayNotHasKey('back', $user->fresh()->equipment['alliance']);

        // Nothing left to sell, and a piece of a set is not for sale
        $this->postJson(route('vendor.sell'), ['item' => 'cape-of-the-brotherhood', 'count' => 1])->assertStatus(422);
        $this->postJson(route('vendor.sell'), ['item' => 'giantstalker-helmet', 'count' => 1])->assertStatus(422);
        $this->assertSame(3 * $value, $user->fresh()->coins);

        // Finding it again, it is theirs again
        $this->drop($user, 'edwin-vancleef', 'cape-of-the-brotherhood');
        $this->assertSame(['cape-of-the-brotherhood' => 1], $this->found($user->fresh()));
    }

    public function test_a_weapon_caught_in_a_game_is_kept_and_can_be_sold(): void
    {
        $user = User::factory()->create();
        $token = $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'alliance'])->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $drop = $game->drops()->create(['item_id' => 'ashkandi2', 'chunk' => 0, 'at_seconds' => 3]);
        $this->travel(30)->seconds();

        // It pays nothing when the game ends
        $this->postJson(route('games.finish', $token), ['score' => 5, 'gameTime' => 25, 'pickups' => [$drop->id], 'items' => ['ashkandi2' => 1]])
            ->assertJsonPath('coins.earned', 0);
        $this->assertSame(['ashkandi2' => 1], $this->found($user));

        $this->putJson(route('equipment.update'), ['equipment' => ['mainhand' => 'ashkandi2']])->assertJsonPath('equipment.mainhand', 'ashkandi2');
        $this->postJson(route('vendor.sell'), ['item' => 'ashkandi2', 'count' => 1])->assertOk()->assertJsonPath('coins', 100);
    }

    public function test_selling_is_for_accounts_that_can_spend(): void
    {
        $this->postJson(route('vendor.sell'), ['item' => 'ripsaw', 'count' => 1])->assertUnauthorized();

        $user = User::factory()->unverified()->create();
        $this->drop($user, 'chief-ukorz-sandscalp', 'ripsaw');
        $this->actingAs($user)->postJson(route('vendor.sell'), ['item' => 'ripsaw', 'count' => 1])->assertStatus(422);
    }

    public function test_a_two_handed_weapon_leaves_the_off_hand_empty_and_gives_more(): void
    {
        $catalog = Gear::catalog();
        $this->assertTrue($catalog['hoggers-trophy-axe']['twoHanded']);
        $this->assertTrue($catalog['ashkandi2']['twoHanded']);
        $this->assertFalse($catalog['cruel-barb']['twoHanded']);
        // Hogger's axe is from zone 2, VanCleef's sword from zone 4, both epic: held in both
        // hands the earlier one still gives more
        $this->assertGreaterThan($catalog['cruel-barb']['stats']['attackPower'], $catalog['hoggers-trophy-axe']['stats']['attackPower']);

        $user = User::factory()->create();
        foreach (['hogger' => 'hoggers-trophy-axe', 'bazil-thredd' => 'stockade-shiv'] as $boss => $item) {
            BossDrop::create(['user_id' => $user->id, 'boss_id' => $boss, 'item_id' => $item, 'rarity' => 'epic', 'dropped_at' => now()]);
        }

        $this->assertSame(['mainhand' => 'hoggers-trophy-axe'], Gear::valid($user, ['mainhand' => 'hoggers-trophy-axe', 'offhand' => 'stockade-shiv']));
        $this->assertSame(['offhand' => 'stockade-shiv'], Gear::valid($user, ['offhand' => 'stockade-shiv']));
    }

    /** What a player owns besides the clothes both hunters start in */
    private function found(User $user): array
    {
        return array_filter(Gear::owned($user), fn ($count, $itemId) => ! Gear::isStarter($itemId), ARRAY_FILTER_USE_BOTH);
    }
}
