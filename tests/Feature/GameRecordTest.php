<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\GameDrop;
use App\Models\User;
use App\Support\LootTable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameRecordTest extends TestCase
{
    use RefreshDatabase;

    private function openGame(array $payload = []): Game
    {
        $token = $this->postJson(route('games.open'), $payload)->assertOk()->json('game');

        return Game::where('token', $token)->firstOrFail();
    }

    private function offer(Game $game, string $itemId, int $atSeconds): GameDrop
    {
        return $game->drops()->create(['item_id' => $itemId, 'chunk' => 0, 'at_seconds' => $atSeconds]);
    }

    public function test_opening_a_game_records_it_and_hands_out_the_first_chunk(): void
    {
        $response = $this->postJson(route('games.open'), ['name' => ' <b>Bob</b> ', 'faction' => 'horde', 'version' => '2.5.0'])
            ->assertOk()
            ->assertJsonStructure(['game', 'chunkSeconds', 'drops']);

        $game = Game::where('token', $response->json('game'))->firstOrFail();

        $this->assertSame('Bob', $game->name);
        $this->assertSame(Game::OPEN, $game->status);
        $this->assertSame(1, $game->chunks_issued);
        $this->assertSame('2.5.0', $game->game_version);
        $this->assertSame('horde', $game->faction);
        $this->assertCount($game->drops()->count(), $response->json('drops'));
    }

    public function test_a_game_can_only_be_opened_for_a_real_side(): void
    {
        $this->postJson(route('games.open'), ['faction' => 'scourge'])->assertStatus(422);

        $this->assertNull($this->openGame()->faction);
    }

    public function test_a_guest_without_a_name_plays_under_their_random_guest_name(): void
    {
        $this->get(route('play'));

        $this->assertSame(session('guest_name'), $this->openGame()->name);
    }

    public function test_a_logged_in_player_always_plays_under_their_account(): void
    {
        $user = User::factory()->create(['name' => 'Thrall']);

        $game = $this->actingAs($user)->postJson(route('games.open'), ['name' => 'Someone Else'])->json('game');

        $this->assertDatabaseHas('games', ['token' => $game, 'name' => 'Thrall', 'user_id' => $user->id]);
    }

    public function test_chunks_are_handed_out_in_order_and_not_before_their_time(): void
    {
        $game = $this->openGame();
        $url = route('games.drops', $game);

        // Chunk 1 starts 30 seconds in; the game may ask for it 15 seconds ahead
        $this->postJson($url, ['chunk' => 1])->assertStatus(425);
        $this->postJson($url, ['chunk' => 2])->assertStatus(422);

        $this->travel(20)->seconds();
        $this->postJson($url, ['chunk' => 1])->assertOk()->assertJsonStructure(['drops']);
        $this->assertSame(2, $game->fresh()->chunks_issued);
    }

    public function test_asking_for_a_chunk_again_returns_the_same_drops(): void
    {
        $game = $this->openGame();
        $this->travel(20)->seconds();

        $first = $this->postJson(route('games.drops', $game), ['chunk' => 1])->json('drops');
        $again = $this->postJson(route('games.drops', $game), ['chunk' => 1])->json('drops');

        $this->assertSame($first, $again);
    }

    public function test_only_drops_offered_to_the_game_can_be_picked_up(): void
    {
        $game = $this->openGame();
        $other = $this->openGame();

        $mine = $this->offer($game, 'ThunderFury', 5);
        $later = $this->offer($game, 'zee', 25);
        $theirs = $this->offer($other, 'ThunderFury', 5);

        $this->travel(10)->seconds();
        $this->postJson(route('games.drops', $game), [
            'chunk' => 0,
            'pickups' => [$mine->id, $later->id, $theirs->id, 999999],
        ])->assertOk();

        $this->assertNotNull($mine->fresh()->claimed_at);
        // Not due yet: the game is 10 seconds old and this drops at 25
        $this->assertNull($later->fresh()->claimed_at);
        $this->assertNull($theirs->fresh()->claimed_at);
    }

    public function test_finishing_a_game_records_it_and_puts_the_score_on_the_leaderboard(): void
    {
        $game = $this->openGame(['name' => 'Bob']);
        $drop = $this->offer($game, 'maladath', 3);
        $this->travel(25)->seconds();

        $this->postJson(route('games.finish', $game), [
            'score' => 120.4,
            'level' => 3,
            'gameTime' => 24,
            'finalCritRating' => 12.5,
            'pickups' => [$drop->id],
            'items' => ['ring1' => 4, 'maladath' => 1, 'made-up' => 9],
        ])
            ->assertOk()
            ->assertJsonPath('legal', true)
            ->assertJsonPath('rank', 1)
            ->assertJsonPath('scores.0.name', 'Bob');

        $game->refresh();
        $this->assertSame(Game::FINISHED, $game->status);
        $this->assertSame(24, $game->game_time);
        $this->assertSame(['ring1' => 4, 'maladath' => 1], $game->items);
        $this->assertNotNull($drop->fresh()->claimed_at);
        $this->assertDatabaseHas('scores', ['game_id' => $game->id, 'name' => 'Bob', 'score' => 120, 'level' => 3]);
    }

    public function test_a_game_can_only_be_finished_once(): void
    {
        $game = $this->openGame();

        $this->postJson(route('games.finish', $game), ['score' => 10])->assertOk();
        $this->postJson(route('games.finish', $game), ['score' => 99999])->assertOk();
        $this->postJson(route('games.drops', $game), ['chunk' => 0])->assertStatus(409);

        $this->assertDatabaseCount('scores', 1);
        $this->assertSame(10, $game->fresh()->score);
    }

    public function test_the_leaderboard_says_how_a_score_was_made(): void
    {
        // One game in gear, in a version of the game
        $geared = $this->openGame(['name' => 'Geared', 'version' => '2.35.0']);
        $this->travel(25)->seconds();
        $this->postJson(route('games.finish', $geared), [
            'score' => 500, 'gameTime' => 24,
            // More pieces than the set has are not believed
            'gear' => ['set' => 'cryptstalker', 'pieces' => 14, 'health' => 45, 'armor' => 72, 'attackPower' => 54],
        ])->assertOk();

        // One without, and one whose set has no piece worn
        $bare = $this->openGame(['name' => 'Bare', 'version' => '2.35.0']);
        $this->travel(25)->seconds();
        $this->postJson(route('games.finish', $bare), ['score' => 300, 'gameTime' => 24])->assertOk();
        $empty = $this->openGame(['name' => 'Empty']);
        $this->travel(25)->seconds();
        $this->postJson(route('games.finish', $empty), ['score' => 200, 'gameTime' => 24, 'gear' => ['set' => 'giantstalker', 'pieces' => 0]])->assertOk();

        $this->assertSame(['set' => 'cryptstalker', 'pieces' => 9, 'health' => 45, 'armor' => 72, 'attackPower' => 54], $geared->fresh()->gear);
        $this->assertNull($bare->fresh()->gear);
        $this->assertNull($empty->fresh()->gear);

        // The game's own high score screen is told
        $this->getJson(route('scores.index'))
            ->assertOk()
            ->assertJsonPath('0.name', 'Geared')
            ->assertJsonPath('0.gear', 'Cryptstalker 9/9')
            ->assertJsonPath('0.gearStats.attackPower', 54)
            ->assertJsonPath('0.version', '2.35.0')
            ->assertJsonPath('1.gear', null)
            ->assertJsonPath('1.version', '2.35.0')
            ->assertJsonPath('2.version', null);

        // And the site's page shows it
        $this->get(route('highscores'))
            ->assertOk()
            ->assertSee('Cryptstalker 9/9')
            ->assertSee('2.35.0')
            ->assertSee('Gear');

        // A set that does not exist is refused
        $other = $this->openGame();
        $this->postJson(route('games.finish', $other), ['score' => 1, 'gear' => ['set' => 'made-up', 'pieces' => 3]])->assertStatus(422);
    }

    public function test_offline_games_are_recorded_but_stay_off_the_leaderboard(): void
    {
        $game = $this->openGame();

        $this->postJson(route('games.finish', $game), ['score' => 500, 'offline' => true])
            ->assertOk()
            ->assertJsonPath('legal', false)
            ->assertJsonPath('rank', null);

        $this->assertTrue($game->fresh()->offline);
        $this->assertDatabaseCount('scores', 0);
        $this->assertSame(0, Game::legal()->count());
    }

    public function test_a_game_that_ran_past_its_chunks_counts_as_offline(): void
    {
        $game = $this->openGame();
        $this->travel(5)->minutes();

        // Only the first 30 seconds of loot were ever asked for
        $this->postJson(route('games.finish', $game), ['score' => 500, 'gameTime' => 200])
            ->assertJsonPath('legal', false);

        $this->assertTrue($game->fresh()->offline);
    }

    public function test_abandoned_games_are_recorded_but_stay_off_the_leaderboard(): void
    {
        $game = $this->openGame();

        $this->postJson(route('games.finish', $game), ['score' => 40, 'abandoned' => true])
            ->assertJsonPath('legal', false);

        $this->assertSame(Game::ABANDONED, $game->fresh()->status);
        $this->assertDatabaseCount('scores', 0);
    }

    public function test_play_time_cannot_be_longer_than_the_game_has_existed(): void
    {
        $game = $this->openGame();
        $this->travel(10)->seconds();

        $this->postJson(route('games.finish', $game), ['score' => 1, 'gameTime' => 9000]);

        $this->assertLessThanOrEqual(11, $game->fresh()->game_time);
    }

    public function test_invalid_results_are_rejected(): void
    {
        $game = $this->openGame();

        foreach ([['score' => -1], ['score' => 'abc'], ['score' => 99999999999], [], ['score' => 1, 'level' => -5]] as $payload) {
            $this->postJson(route('games.finish', $game), $payload)->assertStatus(422);
        }

        $this->assertTrue($game->fresh()->isOpen());
    }

    public function test_opening_games_is_rate_limited(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->postJson(route('games.open'))->assertOk();
        }

        $this->postJson(route('games.open'))->assertStatus(429);
    }

    public function test_the_loot_table_only_rolls_server_decided_items_inside_the_chunk(): void
    {
        $seen = [];

        // Chunk 8 covers seconds 240 to 270, by when every rarity may drop
        for ($i = 0; $i < 300; $i++) {
            foreach (LootTable::rollChunk(8) as $drop) {
                $this->assertTrue(LootTable::decides($drop['item_id']));
                $this->assertGreaterThanOrEqual(240, $drop['at_seconds']);
                $this->assertLessThan(270, $drop['at_seconds']);
                $seen[$drop['item_id']] = true;
            }
        }

        // 300 chunks is two and a half hours of play: every epic turns up many times over, but
        // never the gear the bosses drop
        foreach (config('loot.items.epic') as $itemId) {
            if (in_array($itemId, config('loot.never_falls'), true)) {
                $this->assertArrayNotHasKey($itemId, $seen);
            } else {
                $this->assertArrayHasKey($itemId, $seen);
            }
        }
        foreach (config('loot.never_falls') as $itemId) {
            $this->assertArrayNotHasKey($itemId, $seen);
        }
    }

    public function test_a_game_is_offered_no_more_than_two_set_pieces_from_the_sky(): void
    {
        config(['loot.spawns_per_second' => 400]);
        $pieces = fn (array $drops) => count(array_filter($drops, fn ($drop) => LootTable::setOf($drop['item_id']) !== null));

        $this->assertSame(2, $pieces(LootTable::rollChunk(8, [], 15)));
        $this->assertSame(1, $pieces(LootTable::rollChunk(8, ['ds_helm'], 15)));
        $this->assertSame(0, $pieces(LootTable::rollChunk(8, ['ds_helm', 'giantstalker-boots'], 15)));
    }

    public function test_set_pieces_fall_a_tenth_as_often_as_their_weight_alone_would_have_them(): void
    {
        config(['loot.set_pieces_per_game' => 1000]);
        $count = function () {
            $pieces = 0;
            for ($i = 0; $i < 400; $i++) {
                foreach (LootTable::rollChunk(20, [], 15) as $drop) {
                    $pieces += LootTable::setOf($drop['item_id']) !== null ? 1 : 0;
                }
            }

            return $pieces;
        };

        $rare = $count();
        config(['loot.set_piece_share' => 1]);
        $common = $count();
        // About a tenth: 400 chunks give some 600 pieces at the full rate
        $this->assertGreaterThan(300, $common);
        $this->assertLessThan($common * 0.2, $rare);
        $this->assertGreaterThan($common * 0.04, $rare);
    }

    public function test_each_rarity_is_held_back_until_its_time_and_zee_drops_only_once(): void
    {
        $typeOf = [];
        foreach (config('loot.items') as $type => $ids) {
            $typeOf += array_fill_keys($ids, $type);
        }

        for ($i = 0; $i < 200; $i++) {
            foreach (range(0, 7) as $chunk) {
                foreach (LootTable::rollChunk($chunk) as $drop) {
                    // A piece of a hunter set waits for its own set's time
                    $notBefore = LootTable::setOf($drop['item_id'])['not_before_seconds']
                        ?? config('loot.not_before_seconds.'.$typeOf[$drop['item_id']], 0);
                    $this->assertGreaterThanOrEqual($notBefore, $drop['at_seconds'], $drop['item_id'].' dropped too early');
                }
            }

            // In the first half minute nothing rare but pieces of the first set, and those not at once
            foreach (LootTable::rollChunk(0) as $drop) {
                $this->assertSame('giantstalker', LootTable::setOf($drop['item_id'])['id'] ?? null);
                $this->assertGreaterThanOrEqual(20, $drop['at_seconds']);
            }

            foreach (LootTable::rollChunk(8, ['zee']) as $drop) {
                $this->assertNotSame('zee', $drop['item_id']);
            }
        }
    }
}
