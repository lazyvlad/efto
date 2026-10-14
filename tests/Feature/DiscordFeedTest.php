<?php

namespace Tests\Feature;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\User;
use App\Support\DiscordFeed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DiscordFeedTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK = 'https://discord.com/api/webhooks/1/secret';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.discord.webhook' => self::WEBHOOK]);
        Http::fake([self::WEBHOOK => Http::response(null, 204)]);
        $this->withoutDefer();
    }

    private function play(array $open = [], array $finish = []): Game
    {
        $token = $this->postJson(route('games.open'), $open + ['name' => 'Bob', 'faction' => 'horde'])->json('game');
        $this->travel(25)->seconds();
        $this->postJson(route('games.finish', $token), $finish + ['score' => 1200, 'level' => 3, 'gameTime' => 24])->assertOk();

        return Game::where('token', $token)->firstOrFail();
    }

    public function test_a_finished_game_is_posted_to_the_channel(): void
    {
        $this->play();

        Http::assertSent(fn (Request $request) => $request->url() === self::WEBHOOK
            && str_contains($request['embeds'][0]['description'], '**Bob** scored 1,200 at level 3 for the Horde.')
            && str_contains($request['embeds'][0]['description'], 'That is the new top score.')
            && str_contains($request['embeds'][0]['thumbnail']['url'], 'images/hunters/horde-portrait.jpg')
            && $request['allowed_mentions'] === ['parse' => []]);
        Http::assertSentCount(1);
    }

    public function test_nothing_is_posted_without_a_webhook(): void
    {
        config(['services.discord.webhook' => null]);

        $this->play();

        Http::assertNothingSent();
    }

    public function test_games_that_do_not_count_are_not_posted(): void
    {
        $this->play(finish: ['abandoned' => true]);
        $this->play(finish: ['offline' => true]);
        $this->play(finish: ['score' => 0]);

        Http::assertNothingSent();
    }

    public function test_a_game_handed_in_twice_is_posted_once(): void
    {
        $game = $this->play();
        $this->postJson(route('games.finish', $game), ['score' => 1200])->assertOk();

        Http::assertSentCount(1);
    }

    public function test_the_last_boss_beaten_is_named(): void
    {
        $game = $this->play();
        $game->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'x', 'rarity' => 'common', 'dropped_at' => now()]);

        $this->assertStringContainsString('Last boss down: Sarkoth.', DiscordFeed::message($game));
    }

    public function test_a_player_with_discord_connected_goes_by_their_discord_name(): void
    {
        $user = User::factory()->create(['name' => 'Robert']);
        $user->forceFill(['discord_id' => '1', 'discord_name' => 'Bobzilla'])->save();

        $game = $this->actingAs($user)->play();

        $this->assertStringStartsWith('**Bobzilla** scored', DiscordFeed::message($game));
    }

    public function test_a_boss_fight_is_told_only_when_the_boss_went_down(): void
    {
        $user = User::factory()->create(['name' => 'Bob']);
        BossDrop::create(['user_id' => $user->id, 'boss_id' => 'sarkoth', 'item_id' => 'x', 'rarity' => 'uncommon', 'dropped_at' => now()]);

        // Lost: the boss was not brought down
        $this->actingAs($user)->play(['mode' => 'boss_fight']);
        Http::assertNothingSent();

        $token = $this->postJson(route('games.open'), ['faction' => 'horde', 'mode' => 'boss_fight'])->json('game');
        $this->travel(25)->seconds();
        $this->postJson(route('games.boss', $token), ['boss' => 'sarkoth'])->assertOk();
        $this->postJson(route('games.finish', $token), ['score' => 100, 'gameTime' => 20])->assertOk();

        Http::assertSent(fn (Request $request) => str_contains($request['embeds'][0]['description'], '**Bob** brought down Sarkoth in a boss fight.'));
        Http::assertSentCount(1);
    }

    public function test_a_name_cannot_ping_or_format(): void
    {
        $game = $this->play(['name' => '@everyone **hi** [x](http://a.b)']);

        $message = DiscordFeed::message($game);
        $this->assertStringNotContainsString('@', $message);
        $this->assertStringNotContainsString('](', $message);
    }

    public function test_discord_being_down_does_not_break_the_game(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('down'));

        $this->play();

        $this->assertDatabaseCount('scores', 1);
    }
}
