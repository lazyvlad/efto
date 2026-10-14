<?php

namespace Tests\Feature;

use App\Support\Fingerprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FingerprintTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_logo_icons_and_share_card_carry_their_fingerprints(): void
    {
        $page = $this->get(route('highscores'))->assertOk();

        foreach (['favicon.ico', 'favicon-32x32.png', 'favicon-16x16.png', 'apple-touch-icon.png', 'site.webmanifest', 'images/input-logo.webp', 'images/input-card.jpg'] as $file) {
            $version = substr(md5_file(public_path($file)), 0, 8);
            $page->assertSee(asset($file).'?v='.$version, false);
        }
    }

    public function test_the_game_page_carries_them_too(): void
    {
        $folder = config('game.serve') === 'source' ? 'game-src' : 'game';
        $page = $this->get(route('play'))->assertOk();

        foreach (['favicon.ico', 'apple-touch-icon.png', 'site.webmanifest', 'assets/ui/input-logo.webp'] as $file) {
            $page->assertSee('"'.$file.'?v='.Fingerprint::of(public_path($folder.'/'.$file)).'"', false);
        }
    }

    public function test_the_manifests_point_at_their_icons_as_they_are_now(): void
    {
        // Written by hand: after a new icon, its fingerprint in the manifest needs updating
        foreach (['public', 'game'] as $folder) {
            $manifest = json_decode(file_get_contents(base_path($folder.'/site.webmanifest')), true);

            foreach ($manifest['icons'] as $icon) {
                [$name, $version] = explode('?v=', $icon['src']) + [1 => ''];
                $this->assertSame(substr(md5_file(base_path($folder.'/'.$name)), 0, 8), $version, "$folder/$name");
            }
        }
    }
}
