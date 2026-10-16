<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GamePageTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_shows_the_game_under_the_site_header_for_guests(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('src="'.e(route('play', ['embedded' => 1])).'"', false)
            ->assertSee(route('login'), false)
            ->assertSee(route('register'), false);
    }

    public function test_home_header_shows_the_account_for_logged_in_players(): void
    {
        $user = User::factory()->create(['name' => 'Jaina']);

        $this->actingAs($user)->get('/')
            ->assertOk()
            ->assertSee('Jaina')
            ->assertSee(route('profile.edit'), false)
            ->assertDontSee(route('register'), false);
    }

    public function test_every_page_and_the_game_carry_the_card_for_sharing(): void
    {
        foreach (['home', 'play', 'about', 'highscores', 'items', 'login'] as $page) {
            $this->get(route($page))
                ->assertOk()
                ->assertSee('<meta property="og:title" content="'.e(config('app.name')).'">', false)
                ->assertSee('<meta property="og:image" content="'.\App\Support\Fingerprint::asset('images/input-card.jpg').'">', false)
                ->assertSee('<meta property="og:url" content="'.route($page).'">', false)
                ->assertSee('<meta name="twitter:card" content="summary_large_image">', false);
        }

        $this->assertFileExists(public_path('images/input-card.jpg'));
    }

    public function test_visits_are_counted_once_and_only_where_an_id_is_set(): void
    {
        foreach (['home', 'play', 'about', 'login'] as $page) {
            $this->get(route($page))->assertDontSee('googletagmanager');
        }

        config(['services.google.analytics' => 'G-TEST123']);

        foreach (['home', 'play', 'about', 'login'] as $page) {
            $this->get(route($page))->assertSee('googletagmanager.com/gtag/js?id=G-TEST123', false);
        }

        // Framed by the landing page, the game leaves the counting to that page
        $this->get(route('play', ['embedded' => 1]))->assertDontSee('googletagmanager');

        $admin = \App\Models\User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();
        $this->actingAs($admin)->get(route('admin.dashboard'))->assertOk()->assertDontSee('googletagmanager');
    }

    public function test_the_built_game_takes_its_script_and_styles_from_the_site_s_build(): void
    {
        config(['game.serve' => 'build']);

        $manifest = json_decode(file_get_contents(public_path('build/manifest.json')), true);
        $script = $manifest['game/game-modular.js']['file'];
        $styles = $manifest['game/styles/game.css']['file'];

        $this->assertFileExists(public_path('build/'.$script));
        $this->assertFileExists(public_path('build/'.$styles));

        $html = $this->get(route('play'))->assertOk()->getContent();

        // One script and one stylesheet, each named after its contents, and none of the game's own
        $this->assertStringContainsString('<script type="module" src="'.asset('build/'.$script).'"></script>', $html);
        $this->assertStringContainsString('<link rel="stylesheet" href="'.asset('build/'.$styles).'">', $html);
        $this->assertStringNotContainsString('href="styles/', $html);
        $this->assertStringNotContainsString('src="game-modular', $html);

        // Pictures and sounds are still found in the game's folder
        $this->assertStringContainsString('<base href="'.asset('game').'/">', $html);
    }

    public function test_the_built_game_takes_its_pictures_from_the_bucket_when_there_is_one(): void
    {
        config(['game.serve' => 'build', 'game.asset_url' => 'https://bucket.example/game']);

        $html = $this->get(route('play'))->assertOk()->getContent();

        // Its pictures and sounds from the bucket, asked for as cross-origin requests
        $this->assertStringContainsString('<base href="https://bucket.example/game/">', $html);
        $this->assertStringContainsString("i.crossOrigin='anonymous'", $html);
        $this->assertDoesNotMatchRegularExpression('/<img\b(?![^>]*\bcrossorigin)/i', $html);
        // Its icons and manifest, which are not uploaded, from here; its script from the site's build
        $this->assertMatchesRegularExpression('#href="'.preg_quote(asset('game/favicon.ico'), '#').'(\?v=[^"]*)?"#', $html);
        $this->assertMatchesRegularExpression('#href="'.preg_quote(asset('game/site.webmanifest'), '#').'(\?v=[^"]*)?"#', $html);
        $this->assertStringContainsString('src="'.asset('build/'), $html);
    }

    public function test_a_configuration_cached_before_the_bucket_setting_keeps_the_pictures_here(): void
    {
        config(['game.serve' => 'build', 'game.asset_url' => null]);

        $this->get(route('play'))->assertOk()
            ->assertSee('<base href="'.asset('game').'/">', false)
            ->assertDontSee("i.crossOrigin='anonymous'", false);
    }

    public function test_the_unbuilt_game_never_takes_its_files_from_the_bucket(): void
    {
        config(['game.serve' => 'source', 'game.asset_url' => 'https://bucket.example/game']);

        if (! is_file(public_path('game-src/index.html'))) {
            $this->markTestSkipped('No development link to the unbuilt game here.');
        }

        $this->get(route('play'))->assertOk()
            ->assertSee('<base href="'.asset('game-src').'/">', false)
            ->assertDontSee('bucket.example', false);
    }

    public function test_the_unbuilt_game_keeps_its_own_links(): void
    {
        config(['game.serve' => 'source']);

        if (! is_file(public_path('game-src/index.html'))) {
            $this->markTestSkipped('No development link to the unbuilt game here.');
        }

        $this->get(route('play'))->assertOk()
            ->assertSee('href="styles/base.css"', false)
            ->assertSee('src="game-modular.js', false);
    }

    public function test_the_stylesheet_the_site_builds_lists_the_game_s_stylesheets_in_their_order(): void
    {
        preg_match_all('/^\s*<link rel="stylesheet" href="styles\/([^"?]+)/m', file_get_contents(base_path('game/index.html')), $linked);
        preg_match_all("/^@import '\.\/([^']+)';/m", file_get_contents(base_path('game/styles/game.css')), $imported);

        $this->assertNotEmpty($linked[1]);
        $this->assertSame($linked[1], $imported[1]);
    }

    public function test_pages_carry_the_footer_credit(): void
    {
        foreach (['/', route('highscores'), route('login'), route('register')] as $page) {
            $this->get($page)->assertOk()->assertSee('href="https://barkoder.com"', false);
        }
    }

    public function test_the_game_is_told_when_it_is_framed_by_the_site(): void
    {
        $this->assertFalse($this->bootData($this->get(route('play'))->getContent())['embedded']);
        $this->assertTrue($this->bootData($this->get(route('play', ['embedded' => 1]))->getContent())['embedded']);
    }

    public function test_guests_can_open_the_game_and_get_a_guest_name(): void
    {
        $response = $this->get(route('play'))->assertOk();

        $boot = $this->bootData($response->getContent());

        // A guest account of his own, under his guest name (App\Support\GuestHunter)
        $this->assertTrue($boot['user']['guest']);
        $this->assertFalse($boot['user']['verified']);
        $this->assertMatchesRegularExpression('/^[A-Z][a-z]+[A-Z][a-z]+\d{3}$/', $boot['guestName']);
        $this->assertSame($boot['guestName'], $boot['user']['name']);
        $this->assertSame(route('scores.index'), $boot['urls']['scores']);
        $this->assertSame(route('games.open'), $boot['urls']['games']);
        $this->assertNotEmpty($boot['csrfToken']);
        $response->assertSee('<base href="'.asset('game').'/">', false);
    }

    public function test_the_guest_name_stays_the_same_for_the_session(): void
    {
        $first = $this->bootData($this->get(route('play'))->getContent());
        $second = $this->bootData($this->get(route('play'))->getContent());

        $this->assertSame($first['guestName'], $second['guestName']);
    }

    public function test_logged_in_players_are_passed_to_the_game(): void
    {
        $user = User::factory()->create(['name' => 'Jaina']);

        $boot = $this->bootData($this->actingAs($user)->get(route('play'))->getContent());

        $this->assertSame('Jaina', $boot['user']['name']);
        $this->assertNull($boot['guestName']);
    }

    public function test_the_game_gets_the_players_profile_image_when_there_is_one(): void
    {
        $user = User::factory()->create();

        $this->assertNull($this->bootData($this->actingAs($user)->get(route('play'))->getContent())['user']['avatar']);

        $user->forceFill(['avatar' => 'avatars/1-abc.webp'])->save();

        $this->assertSame(
            asset('storage/avatars/1-abc.webp'),
            $this->bootData($this->actingAs($user)->get(route('play'))->getContent())['user']['avatar']
        );
    }

    private function bootData(string $html): array
    {
        $this->assertSame(1, preg_match('/window\.INPUT_BOOT = (\{.*?\});<\/script>/s', $html, $matches));

        return json_decode($matches[1], true);
    }
}
