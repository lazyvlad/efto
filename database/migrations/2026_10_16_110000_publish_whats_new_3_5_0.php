<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.5.0';

    private const TITLE = 'A fresh start, new boss attacks and more room to fight';

    /**
     * The What's new post for 3.5.0, published as the deploy runs. A post already there for this
     * version (a draft written on a development server) is published as written here instead of
     * added twice.
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
Everyone starts again from the beginning, and the bosses have new tricks to meet you with.

## A fresh start
Until now everyone playing was helping us test, so every hunter starts over: back in his starting clothes, with no gear, set pieces, materials, bags bought, coins, large quiver or bosses beaten. This applies to everyone, guests included. Your games, scores and boss fights stay on record.

## New boss attacks
- **Edwin VanCleef's ambush.** He vanishes and the ground where you stand is marked, while a strip of room opens above it, lit green. Move up into it: he strikes up out of the ground. Then he marks where you are and backstabs there, so step out of that mark too.
- **Gath'Ilzogg's side charge.** He leaves the top of the field and a lane is marked along the ground. Move up into the room it opens as he dashes across from the far side (a hit is massive), then step out of the mark where he strikes next.
- **The big cats change their ways.** King Bangalash, Echeyakee and Shadumbra no longer charge straight down; they ambush and dash along the ground, with throws in between.
- **Stitches' hook.** A red mark appears where you stand, and half a second later his hook flies there. Get out of it: if it catches you, you're dragged in under him and hit.
- **Red means move.** Every red mark is a place not to stand; green is where to go.

## More room to fight
- **Your hunter and the bosses are drawn smaller** on computers and tablets, so there is more room between you. Everything else, from falling loot to creatures, keeps its size, and nothing moves any faster.
- **You can always move up a little**, a third of your hunter's height, enough for melee to reach.
- **Dodging no longer widens the area you can move in**, and the Dodge Area stat is gone.
- **The bosses keep their distance**: in a fight your hunter is held well below the boss, however big or small your window.
- **Dragon Cry** still lets you fly anywhere, but a mark reaches up to wherever you are: flying is no way out of the hook or a backstab.
MARKDOWN;
};
