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

    public function test_the_fight_a_game_ended_in_is_recorded_and_shown(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $token = $this->postJson(route('games.open'), ['faction' => 'alliance'])->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $this->travel(5)->minutes();

        // Garrick went down; the hunter fell to Hogger, who had 40% left
        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk();
        $this->postJson(route('games.finish', $game), ['score' => 900, 'level' => 3, 'gameTime' => 0,
            'bossFight' => ['boss' => 'hogger', 'seconds' => 41.2, 'bossHealth' => 0.404, 'arrows' => 133, 'damage' => 96, 'hits' => 11]])->assertOk();
        $this->assertSame(['boss' => 'hogger', 'seconds' => 41.2, 'bossHealth' => 0.404, 'arrows' => 133, 'damage' => 96, 'hits' => 11], $game->fresh()->last_fight);

        $this->get(route('games.show', $game->id))->assertOk()->assertSee('Fell to Hogger')->assertSee('Hogger at 40%')->assertSee('41.2s');
        $this->get(route('games.history', ['hunter' => 'alliance']))->assertSee('fell to Hogger')->assertSee('Fell to Hogger');
    }

    public function test_a_fight_with_a_boss_that_went_down_or_of_the_other_side_is_not_a_lost_one(): void
    {
        $token = $this->postJson(route('games.open'), ['faction' => 'alliance'])->json('game');
        $game = Game::where('token', $token)->firstOrFail();
        $this->travel(5)->minutes();
        $this->postJson(route('games.boss', $game), ['boss' => 'garrick-padfoot'])->assertOk();

        $fight = ['seconds' => 3, 'bossHealth' => 0, 'arrows' => 1, 'damage' => 0, 'hits' => 0];
        $this->postJson(route('games.finish', $game), ['score' => 10, 'bossFight' => ['boss' => 'garrick-padfoot'] + $fight])->assertOk();
        $this->assertNull($game->fresh()->last_fight);

        $token = $this->postJson(route('games.open'), ['faction' => 'alliance'])->json('game');
        $other = Game::where('token', $token)->firstOrFail();
        $this->postJson(route('games.finish', $other), ['score' => 10, 'bossFight' => ['boss' => 'sarkoth'] + $fight])->assertOk();
        $this->assertNull($other->fresh()->last_fight);
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
