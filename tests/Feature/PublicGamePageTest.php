<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicGamePageTest extends TestCase
{
    use RefreshDatabase;

    private function game(array $attributes = []): Game
    {
        return Game::create($attributes + [
            'token' => Str::random(40),
            'name' => 'Thrall',
            'faction' => 'horde',
            'status' => Game::FINISHED,
            'score' => 4200,
            'level' => 5,
            'game_time' => 300,
            'game_version' => '3.0.7',
            'gear' => ['set' => 'giantstalker', 'pieces' => 3, 'health' => 6, 'armor' => 9, 'attackPower' => 4],
            'started_at' => now(),
        ]);
    }

    public function test_anyone_can_see_how_a_game_on_the_high_scores_went(): void
    {
        $game = $this->game();
        Score::create(['game_id' => $game->id, 'name' => 'Thrall', 'score' => 4200]);
        $game->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'scorpid-stinger', 'rarity' => 'uncommon', 'dropped_at' => now(),
            'fight_seconds' => 21.3, 'points' => 100, 'speed_points' => 29, 'par_seconds' => 30, 'arrows_used' => 64, 'damage_taken' => 22, 'hits_taken' => 3]);

        // From the high scores, a guest follows the score to the game
        $this->get(route('highscores'))->assertSee(route('games.show', $game->id), false)->assertSee('Horde');

        $this->get(route('games.show', $game->id))
            ->assertOk()
            ->assertSee("Thrall's game")
            ->assertSee('Horde hunter')
            ->assertSee('version 3.0.7')
            ->assertSee('Giantstalker 3/8')
            ->assertSee('Sarkoth')
            ->assertSee('21.3s')
            ->assertSee('+29 speed')
            ->assertSee('Scorpid Stinger')
            ->assertSee('#1');
    }

    public function test_a_game_that_is_not_on_the_high_scores_stays_private(): void
    {
        $game = $this->game();

        $this->get(route('games.show', $game->id))->assertNotFound();
        $this->actingAs(User::factory()->create())->get(route('games.show', $game->id))->assertNotFound();
        $this->get('/game/abc')->assertNotFound();
    }

    public function test_the_game_s_own_high_scores_are_told_each_score_s_side(): void
    {
        $game = $this->game();
        Score::create(['game_id' => $game->id, 'name' => 'Thrall', 'score' => 4200]);
        Score::create(['name' => 'Old Timer', 'score' => 100]);

        $this->getJson(route('scores.index'))
            ->assertJsonPath('0.faction', 'horde')
            ->assertJsonPath('1.faction', null);
    }
}
