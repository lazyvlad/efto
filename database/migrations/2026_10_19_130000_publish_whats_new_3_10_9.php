<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.10.9';

    private const TITLE = 'Tools, and an Audio Cutter';

    /**
     * The What's new post for 3.10.9 (everything since 3.10.8), published as the deploy runs. A
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
The site has a new section: **Tools**, in the menu at the top. The first one is an Audio Cutter.

## The Audio Cutter
- **Cut a clip** out of any recording: mark it with the gold bar, or type the start and end to the millisecond.
- **Listen to any part** with the blue bar without moving your cut, or link the two so they move together.
- **Build a track** from several cuts, put them in order, and save the cut or the whole track as WAV, MP3 or OGG.
- **The game's own sounds** are there to start from: the guild's voice lines and the sound effects, one press each.
- **Nothing is uploaded**: it all happens in your browser. Leave the page and come back, and what you had open is still there.

Find it under Tools, or at the Tools page's list, where more will join it.
MARKDOWN;
};
