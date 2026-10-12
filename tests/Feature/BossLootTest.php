<?php

namespace Tests\Feature;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\User;
use App\Support\BossLoot;
use App\Support\Coins;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BossLootTest extends TestCase
{
    use RefreshDatabase;

    private function openGame(array $payload = ['faction' => 'alliance']): Game
    {
        $token = $this->postJson(route('games.open'), $payload)->assertOk()->json('game');

        return Game::where('token', $token)->firstOrFail();
    }

    public function test_a_defeated_boss_drops_one_of_its_items_and_a_player_keeps_it(): void
    {
        $user = User::factory()->create();
        $game = $this->actingAs($user)->openGame();
        $this->travel(60)->seconds();

        $response = $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])
            ->assertOk()
            ->assertJsonPath('boss', 'hogger')
            ->assertJsonPath('kept', true)
            ->assertJsonPath('timesFound', 1);

        $itemIds = array_column(config('boss_loot.bosses.alliance.hogger.loot'), 'id');
        $this->assertContains($response->json('item.id'), $itemIds);
        $this->assertDatabaseHas('boss_drops', [
            'game_id' => $game->id,
            'user_id' => $user->id,
            'boss_id' => 'hogger',
            'item_id' => $response->json('item.id'),
            'rarity' => $response->json('item.rarity'),
        ]);
    }

    public function test_reporting_the_same_boss_again_gives_the_same_item(): void
    {
        $game = $this->actingAs(User::factory()->create())->openGame();
        $this->travel(60)->seconds();

        $first = $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])->json('item.id');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])->assertJsonPath('item.id', $first);
        }

        $this->assertDatabaseCount('boss_drops', 1);
    }

    public function test_a_guest_is_shown_the_item_but_does_not_keep_it(): void
    {
        $game = $this->openGame();
        $this->travel(60)->seconds();

        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])
            ->assertOk()
            ->assertJsonPath('kept', false)
            ->assertJsonPath('timesFound', null);

        $this->assertSame(0, BossDrop::whereNotNull('user_id')->count());
    }

    public function test_a_boss_cannot_be_reported_too_early_from_the_other_side_or_after_the_game(): void
    {
        $game = $this->openGame();

        // Hogger guards the second zone: not within the first 40 seconds
        $this->travel(30)->seconds();
        $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])->assertStatus(425);
        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk();

        $this->travel(5)->minutes();
        $this->postJson(route('games.boss', $game), ['boss' => 'sarkoth'])->assertStatus(422);
        $this->postJson(route('games.boss', $game), ['boss' => 'arthas'])->assertStatus(422);

        $this->postJson(route('games.finish', $game), ['score' => 10])->assertOk();
        $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])->assertStatus(409);

        $this->assertDatabaseCount('boss_drops', 1);
    }

    public function test_every_rarity_can_drop_and_the_common_one_drops_most(): void
    {
        $boss = BossLoot::boss('hogger');
        $counts = ['uncommon' => 0, 'rare' => 0, 'epic' => 0];

        for ($i = 0; $i < 3000; $i++) {
            $counts[BossLoot::roll($boss)['rarity']]++;
        }

        $this->assertGreaterThan($counts['rare'], $counts['uncommon']);
        $this->assertGreaterThan($counts['epic'], $counts['rare']);
        $this->assertGreaterThan(0, $counts['epic']);
    }

    public function test_a_finished_game_banks_its_coins_on_the_account(): void
    {
        $user = User::factory()->create();
        $game = $this->actingAs($user)->openGame();
        $rare = $game->drops()->create(['item_id' => 'maladath', 'chunk' => 0, 'at_seconds' => 3]);
        $this->travel(25)->seconds();
        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk();

        // 4 regular (10) + 2 green (25) + 1 epic the server offered (100) + the first boss (100)
        $this->postJson(route('games.finish', $game), [
            'score' => 50,
            'gameTime' => 24,
            'pickups' => [$rare->id],
            'items' => ['ring1' => 4, 'gizmos' => 2, 'maladath' => 1],
        ])
            ->assertOk()
            ->assertJsonPath('coins.earned', 290)
            ->assertJsonPath('coins.balance', 290);

        $this->assertSame(290, $game->fresh()->coins);
        $this->assertSame(290, $user->fresh()->coins);

        // Handing it in again pays nothing more
        $this->postJson(route('games.finish', $game), ['score' => 50, 'items' => ['ring1' => 400]]);
        $this->assertSame(290, $user->fresh()->coins);
    }

    public function test_rare_items_the_server_did_not_offer_and_impossible_counts_earn_nothing(): void
    {
        $user = User::factory()->create();
        $game = $this->actingAs($user)->openGame();
        $this->travel(15)->seconds();

        // 10 seconds of play can have spawned 6 items; half as many again are allowed: 9
        $this->postJson(route('games.finish', $game), [
            'score' => 50,
            'gameTime' => 10,
            'items' => ['ring1' => 5000, 'ThunderFury' => 20, 'zee' => 3],
        ])->assertJsonPath('coins.earned', 90);

        $this->assertSame(90, $user->fresh()->coins);
    }

    public function test_a_guest_s_game_earns_coins_but_nobody_banks_them(): void
    {
        $game = $this->openGame();
        $this->travel(25)->seconds();

        $this->postJson(route('games.finish', $game), ['score' => 5, 'gameTime' => 20, 'items' => ['ring1' => 3]])
            ->assertJsonPath('coins.earned', 30)
            ->assertJsonPath('coins.balance', null);
    }

    private function beat(User $user, string ...$bossIds): void
    {
        foreach ($bossIds as $bossId) {
            $boss = BossLoot::boss($bossId);
            $user->bossDrops()->create(['boss_id' => $bossId, 'item_id' => $boss['loot']['uncommon']['id'], 'rarity' => 'uncommon', 'dropped_at' => now()]);
        }
    }

    public function test_a_player_can_pay_to_start_past_bosses_they_have_beaten(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 12000])->save();
        $this->beat($user, 'garrick-padfoot', 'hogger');

        $this->assertSame(3, BossLoot::unlockedZone($user, 'alliance'));
        $this->assertSame(1, BossLoot::unlockedZone($user, 'horde'));

        // The third zone: two zones skipped at 50 silver each
        $response = $this->actingAs($user)
            ->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 3])
            ->assertOk()
            ->assertJsonPath('coins', 2000);

        $game = Game::where('token', $response->json('game'))->firstOrFail();
        $this->assertSame(3, $game->start_zone);
        $this->assertSame(5, $game->startLevel());
        $this->assertSame(2000, $user->fresh()->coins);

        // Its first boss is the third: the ones skipped cannot be reported, and it can fall early
        $this->travel(25)->seconds();
        $this->postJson(route('games.boss', $game), ['boss' => 'hogger'])->assertStatus(422);
        $this->postJson(route('games.boss', $game), ['boss' => 'bazil-thredd'])
            ->assertOk()
            ->assertJsonPath('unlockedZone', 4);
    }

    public function test_skipping_needs_the_bosses_beaten_in_a_row_the_coins_and_an_account(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 6000])->save();
        // The second boss beaten but not the first: nothing is open
        $this->beat($user, 'hogger');

        $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 2])->assertStatus(422);

        $this->beat($user, 'garrick-padfoot');
        $this->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 4])->assertStatus(422);
        $this->postJson(route('games.open'), ['faction' => 'horde', 'startZone' => 2])->assertStatus(422);
        // Open, but 1 gold is more than the purse holds
        $this->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 3])->assertStatus(422);

        $this->assertSame(6000, $user->fresh()->coins);
        $this->assertDatabaseCount('games', 0);

        $this->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 2])->assertOk();
        $this->assertSame(1000, $user->fresh()->coins);

        auth()->logout();
        $this->postJson(route('games.open'), ['faction' => 'alliance', 'startZone' => 2])->assertStatus(422);
    }

    public function test_a_game_that_skipped_ahead_is_not_kept_waiting_for_loot_it_has_already_unlocked(): void
    {
        config(['loot.spawns_per_second' => 400]);

        // Level 9 is past the level epics, specials and tier pieces unlock at, but not legendaries
        $types = fn (int $startLevel) => collect(\App\Support\LootTable::rollChunk(0, [], $startLevel))
            ->map(fn (array $drop) => \App\Support\LootTable::typeOf($drop['item_id']))
            ->unique();

        $this->assertEqualsCanonicalizing(['epic', 'special', 'tier_set'], $types(9)->all());
        $this->assertSame([], $types(1)->all());
    }

    public function test_the_game_is_told_what_the_player_may_skip(): void
    {
        $user = User::factory()->create();
        $this->beat($user, 'sarkoth');

        $html = $this->actingAs($user)->get(route('play'))->getContent();
        $this->assertStringContainsString('"skip":{"costPerZone":5000,"unlocked":{"alliance":1,"horde":2}}', $html);

        auth()->logout();
        $this->assertStringContainsString('"skip":null', $this->get(route('play'))->getContent());
    }

    public function test_amounts_read_as_gold_silver_and_copper(): void
    {
        $this->assertSame('0c', Coins::format(0));
        $this->assertSame('45c', Coins::format(45));
        $this->assertSame('1s', Coins::format(100));
        $this->assertSame('12s 5c', Coins::format(1205));
        $this->assertSame('3g', Coins::format(30000));
        $this->assertSame('3g 20s 5c', Coins::format(32005));
        $this->assertSame('1,234g 1c', Coins::format(12340001));
    }

    public function test_my_games_shows_the_boss_loot_and_the_coins(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 32005])->save();
        $game = Game::create(['token' => 'abc', 'user_id' => $user->id, 'name' => 'A', 'status' => Game::ABANDONED, 'started_at' => now()]);
        $game->bossDrops()->create(['user_id' => $user->id, 'boss_id' => 'hogger', 'item_id' => 'huge-gnoll-claw', 'rarity' => 'rare', 'dropped_at' => now()]);

        $this->actingAs($user)->get(route('games.history'))
            ->assertOk()
            ->assertSee('3g 20s 5c')
            ->assertSee('1 of 60 found')
            ->assertSee('Huge Gnoll Claw')
            ->assertSee('text-blue-400');
    }

    public function test_the_game_is_told_the_player_s_balance(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['coins' => 1205])->save();

        $html = $this->actingAs($user)->get(route('play'))->getContent();

        $this->assertStringContainsString('"coins":1205', $html);
    }
}
