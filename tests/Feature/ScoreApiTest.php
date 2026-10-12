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
