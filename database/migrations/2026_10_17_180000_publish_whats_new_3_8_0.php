<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.8.0';

    private const TITLE = 'Spells, steps and safer bags';

    /**
     * The What's new post for 3.8.0 (everything since 3.7.0), published as the deploy runs. A
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
The bosses' spells are painted, your hunter moves properly in every fight, and your bags and bank look after your gear the way they should.

## The bosses' spells
- **Casters' bolts fly as real spells**: Sarkoth's venom, Zalazane's spirits, Taragaman's fire and Hexx's violet bolts, each bursting where it lands. A curse is a swirl of violet, whoever casts it.
- **Rain of Fire and Blizzard** burst where they hit the ground, and a Blizzard leaves frost behind.
- **Stomps raise dust and hexes leave violet rings** on the ground they strike; the safe patch stays clear.
- **Claws, bombs and rifts**: a swipe that lands leaves claw marks, Fozruk's stone shatters, Gerenzo's bomb goes up in flames and an Upheaval opens with a rift.
- **The boss itself shows how it is doing**: a shimmering shield, a burst when your Arcane Shot breaks it, a red fury when it enrages, stars when Thunderfury dazes it, and smoke when it vanishes and comes back.

## Your hunter in a fight
- **He steps while fighting hand to hand too**, not just while shooting.
- **He holds his ranged weapon up when he shoots**: a bow drawn in his left hand, a crossbow raised in front of him, a spear or harpoon held up in both hands, and back on his back a moment after he stops.

## Help in a fight
- **Power Word: Shield in a boss fight now lasts 8 seconds**, long enough to be there when the hit comes. It still takes one hit.
- **Catching Frost Nova no longer hurts.**
- **Frost Traps fall far more often**: about one pickup in four where there are creatures.

## Your bags and your gear
- **Everything to the bank**: one button under your bags sends everything in them to the bank.
- **Gear you catch stays with your hunter**: a piece that went into his 36 is still there next game, instead of slipping into the bank.
- **What he wears stays on him**: leaving things in the bank never takes off what he is wearing; take a piece off first if you want it banked.
MARKDOWN;
};
