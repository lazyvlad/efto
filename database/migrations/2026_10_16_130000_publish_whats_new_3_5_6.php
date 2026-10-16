<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.5.6';

    private const TITLE = 'Faster blades, and a weapon for every style';

    /**
     * The What's new post for 3.5.6 (everything since 3.5.4), published as the deploy runs. A
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
Fighting up close gets quicker, and what you hold now matters: every weapon hits like the kind of weapon it is.

## Faster swings
- **One-handed weapons swing every 1.4 seconds**, two-handed ones every 2.6, both quicker than before.

## Every weapon hits like its kind
- **Your weapon's class sets how hard each blow lands.** Of the one-handers, daggers are the lightest, then swords, axes and maces. Of the two-handers, staves are the lightest, then polearms, greatswords and greataxes.
- **Heavier blows, fewer of them; quicker ones, more of them.** Pick the weapon that suits how you like to fight. Your attack power and critical hits still add to every blow.

## A cleaner swing timer
- **The swing timer under your hunter's feet is now a slim bar**, centred under your health and arrows.
- **While it fills it counts down the seconds**; once your next swing is ready it lights up and shows your weapon's swing time.
- **The numbers beside your health, arrows and swing timer are smaller**, so they all fit.

## Smaller things
- **Loot no longer appears for a moment as a bare glow** when it pops out of a creature or a boss: it shows up already drawn.
MARKDOWN;
};
