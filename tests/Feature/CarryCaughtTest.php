<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Support\Gear;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarryCaughtTest extends TestCase
{
    use RefreshDatabase;

    private function playAndCatch(User $user, string $itemId): void
    {
        $token = $this->actingAs($user)->postJson(route('games.open'), ['faction' => 'alliance'])->assertOk()->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $drop = $game->drops()->create(['item_id' => $itemId, 'chunk' => 0, 'at_seconds' => 3]);
        $this->travel(25)->seconds();
        $this->postJson(route('games.finish', $game), [
            'score' => 10, 'level' => 1, 'gameTime' => 24, 'pickups' => [$drop->id], 'items' => [$itemId => 1],
        ])->assertOk();
    }

    public function test_gear_caught_in_a_game_goes_with_the_hunter(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['carried' => ['alliance' => [], 'horde' => []]])->save();

        $this->playAndCatch($user, 'maladath');

        $this->assertSame(['maladath'], Gear::carriedFor($user->fresh(), 'alliance'), 'in his 36');
        $this->assertSame([], Gear::carriedFor($user->fresh(), 'horde'), "not the other hunter's");
    }

    public function test_with_his_36_full_it_waits_in_the_bank(): void
    {
        $user = User::factory()->create();
        $full = array_fill(0, (int) config('gear.carry'), 'x');
        $user->forceFill(['carried' => ['alliance' => $full, 'horde' => []]])->save();

        $this->playAndCatch($user, 'maladath');

        $this->assertNotContains('maladath', Gear::carriedFor($user->fresh(), 'alliance'));
        $this->assertSame(1, Gear::owned($user->fresh(), 'alliance')['maladath'] ?? 0, 'his all the same, in the bank');
    }

    public function test_a_player_who_never_chose_takes_what_he_caught_anyway(): void
    {
        $user = User::factory()->create();
        $this->playAndCatch($user, 'maladath');

        $this->assertNull($user->fresh()->carried, 'nothing saved for him');
        $this->assertContains('maladath', Gear::carried($user->fresh(), null, null, 'alliance'));
    }
}
