<?php

namespace Tests\Feature;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use App\Support\HunterRecord;
use App\Support\Parses;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ParsesTest extends TestCase
{
    use RefreshDatabase;

    private function kill(float $seconds, string $version = '3.0.8', string $boss = 'hogger', ?User $user = null): BossDrop
    {
        $game = Game::create(['token' => Str::random(40), 'user_id' => $user?->id, 'name' => 'A', 'faction' => 'alliance',
            'status' => Game::FINISHED, 'started_at' => now(), 'game_version' => $version, 'score' => 100]);

        return $game->bossDrops()->create(['user_id' => $user?->id, 'boss_id' => $boss, 'item_id' => 'huge-gnoll-claw', 'rarity' => 'rare',
            'dropped_at' => now(), 'fight_seconds' => $seconds, 'points' => 100, 'speed_points' => 0, 'par_seconds' => 34, 'arrows_used' => 50, 'damage_taken' => 10, 'hits_taken' => 1]);
    }

    public function test_a_parse_is_the_share_of_the_other_kills_it_beat(): void
    {
        $this->assertSame(100, Parses::percentile(10, [10]), 'alone: the best');
        $times = [10, 20, 30, 40, 50];
        $this->assertSame(100, Parses::percentile(10, $times));
        $this->assertSame(75, Parses::percentile(20, $times));
        $this->assertSame(50, Parses::percentile(30, $times));
        $this->assertSame(0, Parses::percentile(50, $times));
        // Just as fast: the same parse
        $this->assertSame(Parses::percentile(20, [10, 20, 20, 40]), Parses::percentile(20, [10, 20, 20, 40]));
        $this->assertSame(33, Parses::percentile(20, [10, 20, 20, 40]));
    }

    public function test_kills_are_compared_within_their_boss_and_version_only(): void
    {
        $fast = $this->kill(12.0);
        $slow = $this->kill(30.0);
        $middle = $this->kill(20.0);
        // Another version, another boss, a kill given by an admin, and one not timed: not compared
        $this->kill(1.0, '3.0.7');
        $this->kill(1.0, '3.0.8', 'garrick-padfoot');
        $this->kill(1.0)->forceFill(['granted' => true])->save();
        $untimed = $this->kill(1.0);
        $untimed->forceFill(['fight_seconds' => null])->save();

        $parses = Parses::of(BossDrop::with('game')->whereKey([$fast->id, $slow->id, $middle->id, $untimed->id])->get());
        $this->assertSame([$fast->id => 100, $slow->id => 0, $middle->id => 50], $parses);
        $this->assertSame('#e5cc80', Parses::color(100));
        $this->assertSame('#9d9d9d', Parses::color(0));
        $this->assertSame('#0070ff', Parses::color(50));
    }

    public function test_the_pages_show_each_kill_s_parse_and_his_best(): void
    {
        $player = User::factory()->create();
        $this->kill(10.0);
        $this->kill(40.0);
        $mine = $this->kill(25.0, user: $player);
        Score::create(['game_id' => $mine->game_id, 'name' => 'A', 'score' => 100]);

        // Beat one of the two others: 50, in blue
        $this->get(route('games.show', $mine->game_id))->assertOk()->assertSee('Parse')->assertSee('#0070ff', false);
        $this->assertSame(50, HunterRecord::bossRecords($player, 'alliance')['hogger']['bestParse']);
        $this->actingAs($player)->get(route('games.history', ['hunter' => 'alliance']))->assertSee('Best parse')->assertSee('>50<', false);
    }
}
