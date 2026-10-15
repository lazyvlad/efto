<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\BossLoot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Besides its item, a boss past the first zones may drop a piece of its zone's hunter set, and
 * a bag (config/boss_loot.php "set_pieces" and "bags").
 */
class BossSetsAndBagsTest extends TestCase
{
    use RefreshDatabase;

    private function openGame(array $payload = ['faction' => 'alliance']): Game
    {
        $token = $this->postJson(route('games.open'), $payload)->assertOk()->json('game');

        return Game::where('token', $token)->firstOrFail();
    }

    private function kill(User $user, string $bossId): array
    {
        $game = $this->actingAs($user)->openGame(['faction' => BossLoot::boss($bossId)['faction']]);
        $this->travel(600)->seconds();

        return $this->postJson(route('games.boss', $game), ['boss' => $bossId])->assertOk()->json();
    }

    public function test_bosses_drop_the_set_of_their_zone(): void
    {
        config(['boss_loot.set_pieces.chance' => 1, 'boss_loot.bags.chance' => 0]);
        $sets = ['hogger' => null, 'bazil-thredd' => null, 'edwin-vancleef' => 'giantstalker', 'gath-ilzogg' => 'giantstalker',
            'stitches' => 'dragonstalker', 'chieftain-nekrosh' => 'dragonstalker', 'fozruk' => 'cryptstalker',
            'king-bangalash' => 'cryptstalker', 'vile-priestess-hexx' => 'cryptstalker', 'echeyakee' => 'giantstalker'];

        foreach ($sets as $bossId => $setId) {
            $drop = $this->kill(User::factory()->create(), $bossId);
            $this->assertSame($setId, $drop['setPiece']['set'] ?? null, $bossId);
        }
    }

    public function test_a_set_piece_from_a_boss_is_his_hunter_s_and_never_one_he_has(): void
    {
        config(['boss_loot.set_pieces.chance' => 1, 'boss_loot.bags.chance' => 0]);
        $user = User::factory()->create();
        $pieces = config('loot.sets.giantstalker.pieces');

        $got = [];
        foreach ($pieces as $ignored) {
            $got[] = $this->kill($user, 'edwin-vancleef')['setPiece']['id'];
        }

        $this->assertEqualsCanonicalizing($pieces, $got, 'each a piece he did not have');
        $this->assertEqualsCanonicalizing($pieces, $user->setPieces('alliance'));
        $this->assertSame([], $user->setPieces('horde'), 'the Horde hunter has none of them');
        // He has them all: no more
        $this->assertNull($this->kill($user, 'edwin-vancleef')['setPiece']);
        // And he carries the first ones he found, worn or in his 36
        $fresh = $user->fresh();
        $this->assertContains($got[0], \App\Support\Gear::carried($fresh, \App\Support\Gear::carriedFor($fresh, 'alliance'), null, 'alliance'));
    }

    public function test_a_guest_is_shown_a_set_piece_and_keeps_nothing(): void
    {
        config(['boss_loot.set_pieces.chance' => 1]);
        $game = $this->openGame();
        $this->travel(600)->seconds();

        $drop = $this->postJson(route('games.boss', $game), ['boss' => 'stitches'])->assertOk()->json();
        $this->assertSame('dragonstalker', $drop['setPiece']['set']);
        $this->assertFalse($drop['kept']);
        $this->assertNull($drop['bag']);
    }

    public function test_bosses_from_the_fourth_zone_drop_bags_that_go_on_at_once(): void
    {
        config(['boss_loot.set_pieces.chance' => 0, 'boss_loot.bags.chance' => 1]);
        $user = User::factory()->create();

        $this->assertNull($this->kill($user, 'bazil-thredd')['bag'], 'not before the fourth zone');

        $drop = $this->kill($user, 'vile-priestess-hexx');
        $this->assertContains($drop['bag']['size'], [12, 14]);
        $this->assertSame([$drop['bag']['size']], $user->fresh()->bags);
        $this->assertSame([$drop['bag']['size']], $drop['bag']['bags']);
    }

    public function test_a_bag_drops_only_when_it_is_bigger_than_a_bag_it_would_replace(): void
    {
        config(['boss_loot.set_pieces.chance' => 0, 'boss_loot.bags.chance' => 1]);
        $user = User::factory()->create();
        $user->forceFill(['bags' => [8, 8, 8, 6]])->save();

        // Fourth zone: 6 or 8, bigger only when it is an 8, which takes the place of the 6
        $drop = $this->kill($user, 'edwin-vancleef')['bag'];
        if ($drop === null) {
            $this->assertSame([8, 8, 8, 6], $user->fresh()->bags);
        } else {
            $this->assertSame(8, $drop['size']);
            $this->assertSame([8, 8, 8, 8], $user->fresh()->bags);
        }

        $user->forceFill(['bags' => [14, 14, 14, 14]])->save();
        $this->assertNull($this->kill($user, 'vile-priestess-hexx')['bag']);
        $this->assertSame([14, 14, 14, 14], $user->fresh()->bags);
    }

    public function test_no_bag_for_an_account_that_cannot_use_rewards(): void
    {
        config(['boss_loot.bags.chance' => 1]);
        $user = User::factory()->unverified()->create();

        $this->assertNull($this->kill($user, 'vile-priestess-hexx')['bag']);
    }
}
