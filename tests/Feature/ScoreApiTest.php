<?php

namespace Tests\Feature;

use App\Models\Score;
use App\Models\User;
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

    public function test_a_guest_can_submit_a_score_under_a_typed_name(): void
    {
        $this->postJson(route('scores.store'), ['name' => ' <b>Bob</b> ', 'score' => 120.4, 'level' => 3])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('scores.0.name', 'Bob');

        $this->assertDatabaseHas('scores', ['name' => 'Bob', 'score' => 120, 'level' => 3, 'user_id' => null]);
    }

    public function test_a_guest_without_a_name_gets_their_random_guest_name(): void
    {
        // Loading the game hands the visitor a guest name for the session
        $this->get(route('play'));
        $guestName = session('guest_name');
        $this->assertNotEmpty($guestName);

        $this->postJson(route('scores.store'), ['score' => 50])->assertOk();

        $this->assertDatabaseHas('scores', ['name' => $guestName, 'score' => 50]);
    }

    public function test_a_logged_in_player_always_scores_under_their_account(): void
    {
        $user = User::factory()->create(['name' => 'Thrall']);

        $this->actingAs($user)
            ->postJson(route('scores.store'), ['name' => 'Someone Else', 'score' => 900])
            ->assertOk()
            ->assertJsonPath('scores.0.registered', true);

        $this->assertDatabaseHas('scores', ['name' => 'Thrall', 'score' => 900, 'user_id' => $user->id]);
    }

    public function test_invalid_scores_are_rejected(): void
    {
        foreach ([['score' => -1], ['score' => 'abc'], ['score' => 99999999999], ['name' => 'a'], ['score' => 1, 'level' => -5]] as $payload) {
            $this->postJson(route('scores.store'), $payload)->assertStatus(422);
        }

        $this->assertDatabaseCount('scores', 0);
    }

    public function test_score_submissions_are_rate_limited(): void
    {
        for ($i = 0; $i < 6; $i++) {
            $this->postJson(route('scores.store'), ['name' => 'Spam', 'score' => $i])->assertOk();
        }

        $this->postJson(route('scores.store'), ['name' => 'Spam', 'score' => 7])->assertStatus(429);
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
