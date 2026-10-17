<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.0';

    private const TITLE = 'Your pet, in the game, and the shots on 1, 2, 3';

    /**
     * The What's new post for 3.10.0 (everything since 3.9.0), published as the deploy runs. A
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
Your pet's stance can now be changed in the middle of a game, and there is a second set of keys with your shots on 1, 2 and 3.

## Your pet, in the game
- **The character sheet** (C) has a new card, **Your pet**: Defensive or Aggressive, one press. The game is paused while the sheet is open, and your pet takes the change the moment you carry on.
- **P** switches it without opening anything.
- Your pet now sits beside your hunter on the character sheet, and is off at a run when it is set to aggressive.

## Two layouts of keys
- In **Settings, Controls** pick the keys to start from: **the usual keys**, or **shots on 1, 2, 3**.
- With the shots on 1, 2, 3: **Autoshot on 1, Multishot on 2, Arcane Shot on 3**, and **T** wears the next of your first three saved sets, round and round. Your fourth set stays on 4.
- Any key can still be changed on top of the layout you pick, and an action can be left with no key at all.
MARKDOWN;
};
