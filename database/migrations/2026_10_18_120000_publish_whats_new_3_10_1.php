<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.1';

    private const TITLE = 'Every window with one bar, and the game on a phone';

    /**
     * The What's new post for 3.10.1 (everything since 3.10.0), published as the deploy runs. A
     * post already there for this version (a draft written on a development server) is
     * published as written here instead of added twice.
     */
    public function up(): void
    {
        // Not into the tests' empty databases (tests/Feature/WhatsNewTest.php runs it itself)
        if (app()->environment('testing') && ! app()->bound('publish-whats-new')) {
            return;
        }

        $post = NewsPost::firstOrNew(['version' => self::VERSION]);
        $post->forceFill([
            'user_id' => $post->user_id ?? User::where('is_admin', true)->orderBy('id')->value('id'),
            'title' => self::TITLE,
            'body' => self::BODY,
            'published_at' => $post->published_at ?? now(),
        ])->save();
    }

    public function down(): void
    {
        NewsPost::where('version', self::VERSION)->where('title', self::TITLE)->delete();
    }

    private const BODY = <<<'MARKDOWN'
Every window now has the same bar along its top, so Back and Close are always where you left them, and the game is much easier to play on a phone.

## One bar for every window
- **Back is always top left, Close always top right**, the same size on every screen: Character, Bags, Gear, Crafting, How to play, Loot, High scores and Settings.
- **Back says where it goes** ("to the game", "to the pause menu", "to the map") and goes there from any tab.
- **Character, Bags, Gear and Crafting are tabs of one window**: switching between them no longer moves anything.

## On a phone
- **The slim panels** at the top of the field, held upright too, in place of the old tall boxes.
- **Every window fills the screen**, the pause screen and the end of a game included. Held sideways, the pause screen fits without scrolling, and the tabs move into the bar.
- **Settings** uses buttons instead of drop-down lists, so nothing is cut short; settings that only make sense with a mouse and keyboard are hidden.
- **Crafting and the character sheet** fit the screen: shorter slot names, and ingredient rows with room for their buttons.

## Fixed
- **The Haste Potion** looks like a potion now (a proper painting of its own is on the way).
- **The end of a game**: your hunter no longer covers the line under "Game over".
MARKDOWN;
};
