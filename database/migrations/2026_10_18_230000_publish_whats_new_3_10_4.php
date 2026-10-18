<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.4';

    private const TITLE = 'Trailhide: armor from the first bosses';

    /**
     * The What's new post for 3.10.4 (everything since 3.10.3), published as the deploy runs. A
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
The first bosses now drop a full set of armor: Trailhide, eight pieces of worn leather to dress your hunter before you move on.

## Trailhide
- **Eight pieces**: Hood, Shoulderpads, Jerkin, Bracers, Grips, Belt, Leggings and Boots, painted for both hunters. (The tauren keeps his cap and horns.)
- **Green and blue**: each piece drops as a green, or more rarely as a stronger blue "Fine" one.
- **Where**: the first boss of each side, Garrick Padfoot in Northshire Abbey and Sarkoth in the Valley of Trials, as one of their two extra drops. Pieces you do not have yet come first, so a few runs fill out the set.
- **Not instead of anything**: the zone's creatures and sky drop its ring, neck, trinket, cloak and bow as often as before.

## Coming
- Two more sets are being painted, for the second and third zones.
MARKDOWN;
};
