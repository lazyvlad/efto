<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.5.4';

    private const TITLE = 'Longer zones and livelier creatures';

    /**
     * The What's new post for 3.5.4 (everything since 3.5.0), published as the deploy runs. A
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
More time in every zone, and more to do there: creatures come more often, count towards your next level, and can be fought off before they ever bite.

## Longer zones
- **Every level takes longer**, so you get about a minute in your first zone before its boss instead of a few seconds, and around three minutes in the last ones.
- **Creatures give experience.** Bringing one down, with arrows or your weapon, counts towards your next level as well as catching things does. A bruiser gives more.
- **More creatures.** They come more often and sooner into a zone, up to three at a time (four in Westfall).

## Fighting creatures up close
- **Your hunter reaches creatures from further off.** Meet one as it comes down and your blows knock it back before it can pounce: time them well and you won't be bitten at all.
- **Against bosses your reach is unchanged**, so they still have to come to you.

## Boss fights
- **King Bangalash, Echeyakee and Shadumbra stay up top longer.** After an ambush or a dash along the ground, a boss now spends a while up there throwing before the next, so there's time to shoot it. The cats also throw more and send rows between their tricks.
- **Rows of daggers can't be dodged by squeezing between them any more.** The one gap the boss leaves is the place to stand.
- **A charge hurts across its whole lane again.**
- **Hitting a charging boss from beside its lane has a price:** when it lands, anyone within reach of the lane takes part of the blow. Still worth it, if you have the health.

## Smaller things
- **Thunderfury is held by its handle**, not beside it.
- **The game's pictures and sounds now come from Amazon's storage**, taking load off our server.
MARKDOWN;
};
