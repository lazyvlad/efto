<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.8';

    private const TITLE = 'Armor for the second and third zones';

    /**
     * The What's new post for 3.10.8 (everything since 3.10.7), published as the deploy runs. A
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
Trailhide has company: two more armor sets, each from its own zone's bosses.

## Two new armor sets
- **Briarwatch**, olive leather with iron rivets, falls from the bosses of Eastvale and Razor Hill: a cap, shoulderpads, a vest, bracers, gloves, a belt, leggings and boots. The greens are item level 15; the rarer blue **Fine Briarwatch** pieces are 20.
- **Gatewarden**, dusk-blue leather and chain, falls from the bosses of Stormwind and the Valley of Strength: a helmet, pauldrons, a hauberk, bracers, gauntlets, a girdle, legguards and boots. Greens are item level 20, the **Fine Gatewarden** blues 25.
- **Either hunter can wear them**, and your hunter wears them on the character sheet and in a fight.

Find every piece on the Items page, under Armor of the early zones.
MARKDOWN;
};
