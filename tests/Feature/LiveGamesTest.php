<?php

namespace Tests\Feature;

use App\Models\Game;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LiveGamesTest extends TestCase
{
    use RefreshDatabase;

    private function open(string $name, string $faction = 'horde'): Game
    {
        $token = $this->postJson(route('games.open'), ['name' => $name, 'faction' => $faction])->assertOk()->json('game');

        return Game::where('token', $token)->firstOrFail();
    }

    public function test_nobody_playing(): void
    {
        $this->get(route('live'))->assertOk()->assertSee('Nobody is playing right now.');
    }

    public function test_a_game_being_played_shows_how_it_is_going(): void
    {
        $game = $this->open('Thrall');

        // A game just opened is there at once
        $this->get(route('live'))->assertOk()->assertSee('Thrall')->assertSee('Just started');

        // As it asks for its loot it says how it is going
        $this->postJson(route('games.drops', $game), ['chunk' => 0, 'progress' => ['score' => 1234, 'level' => 4, 'boss' => 'zalazane', 'bossHealth' => 0.42]])->assertOk();
        $this->assertSame(['score' => 1234, 'level' => 4, 'boss' => 'zalazane', 'bossHealth' => 0.42], $game->fresh()->live);

        $this->get(route('live'))->assertSee('1,234')->assertSee('Level 5 · zone 3')->assertSee('Fighting Zalazane')->assertSee('42%');
        // The page asks for the list alone to refresh itself
        $this->get(route('live', ['list' => 1]))->assertOk()->assertSee('Fighting Zalazane')->assertDontSee('<html', false);

        // A boss down: no longer fighting it
        $this->travel(5)->minutes();
        $this->postJson(route('games.boss', $game), ['boss' => 'sarkoth'])->assertOk();
        $this->assertNull($game->fresh()->live['boss']);
        $this->get(route('live'))->assertSee('Down:')->assertSee('alt="Sarkoth"', false);
    }

    public function test_games_over_or_long_unheard_from_are_not_live(): void
    {
        $finished = $this->open('Finished');
        $this->postJson(route('games.finish', $finished), ['score' => 10])->assertOk();
        $this->open('Gone quiet');
        $this->travel(Game::LIVE_SECONDS + 5)->seconds();
        $this->open('Still here');

        $this->get(route('live'))
            ->assertSee('Still here')
            ->assertDontSee('Gone quiet')
            ->assertDontSee('Finished');
    }
}
