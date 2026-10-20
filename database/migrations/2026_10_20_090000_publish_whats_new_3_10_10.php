<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.10';

    private const TITLE = 'Your bank, easier to find';

    /**
     * The What's new post for 3.10.10 (everything since 3.10.9), published as the deploy runs. A
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
A small fix for the bags screen.

## Bank or vendors, side by side
- **Beside your bags**, the column shows either your bank or the vendors (bags and materials). Which one is now a clear **Bank | Vendor** switch at the top of that column.
- Before, the way back to the bank was a small button among your bag labels, and it was easy to think the bank had gone. It never had: everything you put in it is still there.

Open it from Inventory, then Bags.
MARKDOWN;
};
