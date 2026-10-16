<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.5.8';

    private const TITLE = 'Your games on Discord, told in full';

    /**
     * The What's new post for 3.5.8 (everything since 3.5.6), published as the deploy runs. A
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
Every game you finish now gets a proper write-up in our Discord's game channel, and the games you played before signing up finally carry your name.

## Your games on Discord
- **Each game gets a card in the game channel**: your score and level, how long the game took and the coins you made.
- **The bosses you brought down are listed**, in the order they fell.
- **Your best loot is named**: the epics and blues you got from bosses or caught on the way, legendaries first.
- **A picture under the card** shows those bosses and your loot, each item framed in its rarity's colour.
- **Links on every card** take you to the game's own page (each boss fight, how long it took, what you caught) and to the high scores.
- **The guild's bot cheers every game on**, with an extra trophy for winning the game, clearing a Boss Rush or making the top ten, and a heart for epic loot.

## Your name on your games
- **Games you played as a guest now show under your name** once you sign up or bring them into your account: on the high scores, in the game and on Discord. Games brought over before this are renamed too.
MARKDOWN;
};
