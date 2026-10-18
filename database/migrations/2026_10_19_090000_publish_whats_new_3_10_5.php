<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.5';

    private const TITLE = 'Endless arrows, and bags that keep what matters';

    /**
     * The What's new post for 3.10.5 (everything since 3.10.4), published as the deploy runs. A
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
The mana potion now gives you endless arrows, your backpack is bigger, and full bags no longer quietly cost you your materials.

## The mana potion: endless arrows
- **Catch or drink one** (M) and for **10 seconds your shots spend no arrows**: Multishot as much as you like. The arrow count shows **∞** while it lasts. It no longer slows time.
- **In boss fights** a mana potion now drops every 20 seconds, between the health potions. Health potions and arrows drop as often as ever.

## A bigger backpack
- Everyone's backpack now holds **24 slots, up from 16**. Bags you buy still add to it.

## Full bags, handled
- **Junk makes room for materials.** If your bags are full when you catch a material, a stack of junk (already paid for when you caught it) is pushed out to make room.
- **Stronger materials first.** With no junk left, a material from a later zone pushes out one from an earlier zone, which is sold for less. Prefer to keep what you have? Settings, **Your bags**: "Keep what's in them".
- **You are told.** Nearly full bags are pointed out before you start, with a way to your bags. In a game, a material lost says "No room" over your hunter and the Bags full sign lights up. At the end, the screen names what was lost.
MARKDOWN;
};
