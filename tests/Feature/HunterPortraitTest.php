<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class HunterPortraitTest extends TestCase
{
    use RefreshDatabase;

    private function scored(?User $user, ?string $side, string $name): void
    {
        $game = Game::create([
            'token' => Str::random(40),
            'user_id' => $user?->id,
            'name' => $name,
            'faction' => $side,
            'status' => Game::FINISHED,
            'started_at' => now(),
        ]);

        Score::create(['game_id' => $game->id, 'user_id' => $user?->id, 'name' => $name, 'score' => 100]);
    }

    public function test_a_score_without_a_picture_shows_the_hunter_of_its_side(): void
    {
        $this->scored(null, 'horde', 'Thrall');
        $this->scored(User::factory()->create(['name' => 'Jaina']), 'alliance', 'Jaina');

        $this->get(route('highscores'))
            ->assertOk()
            ->assertSee('images/hunters/horde-portrait.webp?v=', false)
            ->assertSee('images/hunters/alliance-portrait.webp?v=', false);
    }

    public function test_a_player_s_own_picture_comes_first_and_an_old_game_keeps_the_initial(): void
    {
        $this->scored(User::factory()->create(['name' => 'Anduin', 'avatar' => 'avatars/anduin.webp']), 'alliance', 'Anduin');
        $this->scored(null, null, 'Old Timer');

        $this->get(route('highscores'))
            ->assertOk()
            ->assertSee('storage/avatars/anduin.webp', false)
            ->assertDontSee('images/hunters/', false)
            ->assertSee('>O</span>', false);
    }
}
