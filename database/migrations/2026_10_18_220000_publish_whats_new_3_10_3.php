<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.3';

    private const TITLE = 'A button for your pet, and better gear pointed out';

    /**
     * The What's new post for 3.10.3 (everything since 3.10.2), published as the deploy runs. A
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
Your pet has a button of its own in the game, and the character sheet now tells you when you own something better than what you wear.

## A button for your pet
- **On the spell bar, beside Dragon Cry and Zandalari**: your pet, with how it fights written under it, **Defensive** in blue or **Aggressive** in red.
- **Press it, tap it, or press P** to switch. It lights up in its new colour and says so for a moment.
- **On a phone** it is a round button at the top of the right-hand column: the first way to switch your pet during a game there.

## Better gear, pointed out
- **A green arrow** on a slot of the character sheet means you own something stronger for it that you are not wearing. Point at the slot to see what.
- **Rings and trinkets** already worn in the other slot are marked "Worn in Ring 1" (or Trinket 1) in the list, and their button says "Move here", so the same one is not taken off one finger by mistake.

## New art
- **The Haste Potion** has its own painting: an hourglass flask of swirling gold.
MARKDOWN;
};
