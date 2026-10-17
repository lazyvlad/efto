<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.7.0';

    private const TITLE = 'The bosses come alive';

    /**
     * The What's new post for 3.7.0 (everything since 3.5.8), published as the deploy runs. A
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
The bosses finally move, every zone has creatures of its own, the first bosses are far more generous, and your hunter steps as he walks.

## The bosses come alive
- **All twenty bosses are animated**: they idle, wind up, throw, charge, vanish and reappear, dash across the field, stomp, call down their storms, flinch when you hit them and collapse when they fall.
- **Watch the wind-up**: a boss's pose shows how far it is into its next attack, and later bosses and enraged ones wind up visibly faster.
- **Stitches throws his hook from his own hand**, chain and all.
- The fights themselves are unchanged: the same timing, the same damage.

## Every zone has its own creatures
- **33 new creatures**, painted for their zones: Defias in Stormwind and Westfall, gnolls in Redridge, ghouls and worgen in Duskwood, murlocs in the Wetlands, harpies at Sun Rock, satyrs and furbolgs in Ashenvale, centaurs and naga in Desolace, ogres in Tanaris, and more.
- Each zone has a common creature and a tougher bruiser, which turns up about a quarter of the time.

## More loot from the first three bosses
- In a normal game, each of the first three bosses now **drops two more pieces of its zone's gear** besides its own item: mostly green, now and then blue.
- **Pieces you don't have yet come first**, so a few runs dress your hunter well enough to push further in.

## Your hunter on the move
- **He steps as he walks**: his weight shifts, each boot (or hoof) lifts in turn, and he leans into the move.
- **Capes and tabards swing** with his steps, and the weapons on his back stay straight.

## Gear in a fight
- **Your off-hand comes with you**: in a hand-to-hand fight your hunter now holds it up as a guard while he swings.
- **Belts and tabards stay whole** while you swing, with no gaps around the hands.
- **Thick Bear Fur no longer stops the Horde hunter fighting hand to hand.**
- **Nine weapons hang properly**, blade down on the back or in a sheath at the hip, and are drawn from there: Brutality Blade, Maladath, Cruel Barb, Embalmer's Cleaver, Nek'rosh's Spiked Mace, Vilebranch Soul Dagger, Cursed Felblade, Ripsaw and Jang'thraze.

## On Discord
- The guild's bot now reacts to every game in the game channel with our own emojis.
MARKDOWN;
};
