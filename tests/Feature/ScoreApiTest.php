<?php

namespace Tests\Feature;

use App\Models\Score;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScoreApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_leaderboard_is_sorted_and_in_the_shape_the_game_reads(): void
    {
        Score::create(['name' => 'Low', 'score' => 10]);
        Score::create(['name' => 'High', 'score' => 500, 'level' => 7, 'final_crit_rating' => 12.5]);

        $this->getJson(route('scores.index'))
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'High')
            ->assertJsonPath('0.score', 500)
            ->assertJsonPath('0.level', 7)
            ->assertJsonPath('0.finalCritRating', 12.5)
            ->assertJsonPath('0.registered', false)
            ->assertJsonPath('1.name', 'Low');
    }

    public function test_the_latest_version_of_the_game_comes_first(): void
    {
        $score = function (string $name, int $points, ?string $version) {
            $game = \App\Models\Game::create(['token' => \Illuminate\Support\Str::random(40), 'name' => $name, 'status' => 'finished',
                'started_at' => now(), 'score' => $points, 'game_version' => $version]);
            Score::create(['game_id' => $game->id, 'name' => $name, 'score' => $points]);

            return $game;
        };

        $score('Old best', 9000, '2.43.0');
        $score('Old second', 500, '2.43.0');
        // "2.9" is before "2.43", not after it as text would have it
        $score('Older', 9999, '2.9.0');
        $newest = $score('Newest', 40, '3.0.6');
        $score('New', 3000, '3.0.4');
        Score::create(['name' => 'From the old list', 'score' => 99999]);

        $this->getJson(route('scores.index'))
            ->assertOk()
            ->assertJsonPath('*.name', ['Newest', 'New', 'Old best', 'Old second', 'Older', 'From the old list']);

        $this->assertSame(3000004, \App\Models\Game::where('name', 'New')->value('version_rank'));
        // Where a score stands: among the scores of its own version
        $this->assertSame(1, Score::rankOf($newest->score, $newest->version_rank));
        $this->assertSame(1, Score::rankOf(9500, 2043000));
        $this->assertSame(2, Score::rankOf(600, 2043000));
        $this->assertSame(1, Score::rankOf(100000, null));

        // The page shows each version as a group, places counted within it
        $this->get(route('highscores'))->assertOk()
            ->assertSeeInOrder(['Version 3.0.6', 'Newest', 'Version 3.0.4', 'New', 'Version 2.43.0', 'Old best', 'Old second', 'Version 2.9.0', 'Older', 'Older scores', 'From the old list']);
    }

    public function test_old_json_scores_can_be_imported(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'scores');
        file_put_contents($file, json_encode([
            ['name' => 'Old Timer', 'score' => 943, 'level' => 24, 'finalCritRating' => 30, 'timestamp' => '2025-07-01T00:39:34+00:00'],
            ['name' => 'No Score'],
        ]));

        $this->artisan('scores:import', ['file' => $file])->assertSuccessful();
        unlink($file);

        $this->assertDatabaseCount('scores', 1);
        $this->assertDatabaseHas('scores', ['name' => 'Old Timer', 'score' => 943, 'level' => 24]);
        $this->assertSame('2025-07-01', Score::first()->created_at->toDateString());
    }
}
