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
        Http::fake([
            self::WEBHOOK.'*' => Http::response(['id' => '222', 'channel_id' => '111'], 200),
            'discord.com/api/v10/channels/*' => Http::response(null, 204),
        ]);
        $this->withoutDefer();
    }

    /** What a request posted: as JSON, or (with a picture) in the multipart's payload_json */
    private function payload(Request $request): array
    {
        if (! $request->isMultipart()) {
            return $request->data();
        }
        $part = collect($request->data())->firstWhere('name', 'payload_json');

        return json_decode($part['contents'] ?? '{}', true);
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

        Http::assertSent(fn (Request $request) => $request->url() === self::WEBHOOK.'?wait=true'
            && str_contains($request['embeds'][0]['description'], '**Bob** scored 1,200 at level 3 for the Horde.')
            && str_contains($request['embeds'][0]['description'], 'That is the new top score.')
            && str_contains($request['embeds'][0]['thumbnail']['url'], 'images/hunters/horde-portrait.jpg')
            && $request['allowed_mentions'] === ['parse' => []]);
        Http::assertSentCount(1);
    }

    public function test_with_a_bot_set_up_the_post_gets_its_reactions(): void
    {
        config(['services.discord.bot_token' => 'bot-token']);
        $this->play();

        // The same few on every game; this one is the top score, so a trophy too
        $reacted = collect(Http::recorded())->map(fn ($pair) => $pair[0])
            ->filter(fn (Request $request) => $request->method() === 'PUT')
            ->map(fn (Request $request) => rawurldecode(explode('/', $request->url())[10]))
            ->values()->all();
        $this->assertSame(['🔥', '👏', '🏹', '🏆'], $reacted);
        Http::assertSent(fn (Request $request) => $request->method() === 'PUT'
            && str_starts_with($request->url(), 'https://discord.com/api/v10/channels/111/messages/222/reactions/')
            && $request->header('Authorization') === ['Bot bot-token']);
    }

    public function test_without_a_bot_there_are_no_reactions(): void
    {
        $this->play();

        Http::assertSentCount(1);
    }

    public function test_the_bosses_and_the_loot_come_as_a_picture_under_the_card(): void
    {
        $game = $this->play();
        $game->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'cruel-barb', 'rarity' => 'epic', 'dropped_at' => now()]);

        $png = DiscordFeed::image($game);
        $this->assertNotNull($png);
        $this->assertSame("\x89PNG", substr($png, 0, 4));
        // Two rows: the boss, then the loot
        [$width, $height] = getimagesizefromstring($png);
        $this->assertSame([72, 152], [$width, $height]);
        $this->assertSame('attachment://game.png', DiscordFeed::post($game, true)['embeds'][0]['image']['url']);

        // Sent with the post, as a file
        DiscordFeed::send(self::WEBHOOK, DiscordFeed::post($game, true), [], $png);
        Http::assertSent(fn (Request $request) => $request->isMultipart()
            && $request->hasFile('files[0]', $png, 'game.png')
            && $this->payload($request)['embeds'][0]['image']['url'] === 'attachment://game.png');
    }

    public function test_a_game_with_neither_bosses_nor_loot_has_no_picture(): void
    {
        $game = $this->play();

        $this->assertNull(DiscordFeed::image($game));
        $this->assertArrayNotHasKey('image', DiscordFeed::post($game)['embeds'][0]);
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

    /** A field of the card posted for a game, by its name's start */
    private function field(Game $game, string $name): ?string
    {
        foreach (DiscordFeed::post($game)['embeds'][0]['fields'] as $field) {
            if (str_starts_with($field['name'], $name)) {
                return $field['value'];
            }
        }

        return null;
    }

    public function test_the_card_tells_the_time_the_coins_and_the_bosses_brought_down(): void
    {
        $game = $this->play();
        $game->forceFill(['game_time' => 754, 'coins' => 43_85])->save();
        $game->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'x', 'rarity' => 'common', 'dropped_at' => now()->subMinute()]);
        $game->bossDrops()->create(['boss_id' => 'zalazane', 'item_id' => 'y', 'rarity' => 'common', 'dropped_at' => now()]);

        $this->assertSame('12:34', $this->field($game, 'Time'));
        $this->assertSame('43s 85c', $this->field($game, 'Coins'));
        $this->assertSame('Sarkoth · Zalazane', $this->field($game, 'Bosses down (2)'));
    }

    public function test_the_best_loot_is_named_rarest_first_and_the_common_left_out(): void
    {
        $game = $this->play();
        $game->bossDrops()->create(['boss_id' => 'sarkoth', 'item_id' => 'cape-of-the-brotherhood', 'rarity' => 'rare', 'dropped_at' => now()]);
        $game->bossDrops()->create(['boss_id' => 'zalazane', 'item_id' => 'cruel-barb', 'rarity' => 'epic', 'dropped_at' => now()]);
        $game->bossDrops()->create(['boss_id' => 'taragaman', 'item_id' => 'blackened-defias-belt', 'rarity' => 'uncommon', 'dropped_at' => now()]);

        $this->assertSame("🟣 Cruel Barb\n🔵 Cape of the Brotherhood", $this->field($game, 'Best loot'));
    }

    public function test_the_card_links_to_the_game_and_the_high_scores(): void
    {
        $game = $this->play();

        $description = DiscordFeed::post($game)['embeds'][0]['description'];
        $this->assertStringContainsString('[The game]('.route('games.show', $game).')', $description);
        $this->assertStringContainsString('[High scores]('.route('highscores').')', $description);
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

        Http::assertSent(fn (Request $request) => str_contains($this->payload($request)['embeds'][0]['description'] ?? '', '**Bob** brought down Sarkoth in a boss fight.'));
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
