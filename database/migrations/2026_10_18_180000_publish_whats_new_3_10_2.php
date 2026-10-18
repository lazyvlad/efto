<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.2';

    private const TITLE = 'A roomier character sheet, strongest gear first';

    /**
     * The What's new post for 3.10.2 (everything since 3.10.1), published as the deploy runs. A
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
The character sheet makes room for your gear: its cards fold away, and your strongest pieces come first.

## Cards that fold
- **What he has, Your pet, Your sets and The slot picked** each fold up to their title with a click, and open again the same way. The sheet remembers how you left them.
- **Your pet's card starts folded**: its title still says how it fights, and P changes it in a game.
- **Picking a slot always opens its list**, which now has several times the room it had, a scrollbar you can see, and "More below" when there is more.

## Strongest first
- **The items for a slot**, and each kind of gear on the inventory's Gear tab, are listed strongest first: attack power counts double, health once, armor half, and every per cent of crit or dodge counts ten.

## Tidier
- **The purse moved up** next to your name, and between games the Alliance/Horde switch sits there too: the row under the tabs is gone.
MARKDOWN;
};
