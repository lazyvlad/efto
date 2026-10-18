<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.6';

    private const TITLE = 'Fairer ambushes, and your bags emptied for you';

    /**
     * The What's new post for 3.10.6 (everything since 3.10.5), published as the deploy runs. A
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
A few fixes after the last update: the ambushing bosses are fairer, the mana potion is tamer in boss fights, and the end of a game offers to clear your bags.

## Ambushes
- **Edwin VanCleef and the big cats** lose their shield when their vanish, ambush and backstab are over. A shield on top of an ambush was too much.

## The mana potion
- **In a boss fight, its endless arrows last 4 seconds** (still 10 everywhere else). It was too strong against the bosses.

## Your bags, after a game
- **The end of a game now offers to empty your bags into the bank** in one press, so the next game has room for everything you catch.
MARKDOWN;
};
