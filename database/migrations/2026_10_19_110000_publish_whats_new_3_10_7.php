<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.7';

    private const TITLE = 'A new How to play';

    /**
     * The What's new post for 3.10.7 (everything since 3.10.6), published as the deploy runs. A
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
The How to play screen was written long before bosses, gear, bags and crafting. It now explains the game as it is.

## How to play, rewritten
- **Everything in one place**: the zones and their bosses, your shots and spells with their cooldowns, your pet and its button, the three potions, what to catch and what to shoot down, how bosses fight (shields, Arcane Shot, ambushes), gear and the character sheet, bags, the bank and crafting, and what coins buy.
- **Your own keys**: the keys it names are the ones you have set, in either layout.
- **On a phone** it leaves out what only matters with a keyboard and mouse.

Open it from the Game menu on the map, or from the pause screen.
MARKDOWN;
};
