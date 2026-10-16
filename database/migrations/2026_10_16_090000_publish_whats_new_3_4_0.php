<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.4.0';

    private const TITLE = 'Creatures, melee, loot from the bosses and the Frost Trap';

    /**
     * The What's new post for 3.4.0 (everything since 3.0.10), published as the deploy runs. A post
     * already there for this version (a draft written on a development server) is published as
     * written here instead of added twice.
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
The biggest round yet: creatures to fight hand to hand, loot that comes from the bosses, gear in your bags, a new trap, help in boss fights, guests who keep what they find, and a cleaner screen to play it all on.

## Creatures, and fighting them up close
- **Every starting zone has wildlife of its own.** Timber Wolves and Kobold Workers in Northshire, Prowlers in Eastvale, Harvest Golems in Westfall, Scorpid Workers and Mottled Boars in the Valley of Trials, Bloodtalon Raptors around Razor Hill. They come in from the top, stalk, close in on your hunter and pounce.
- **A pounce is always warned:** the creature gathers itself before it leaps, at where you were when it began. Step aside and it misses.
- **Arrows push them back**, and a creature knocked back loses ground. Reverse Gravity throws them about the field.
- **Creatures stay when a boss comes in** and fight on beside it. No more arrive until the boss is down.
- **They carry their zone's gear.** A creature brought down may drop a piece of it, and it's yours.

## Melee
- **Your hunter fights with his main-hand weapon when something gets close.** He draws it off his back, swings, and puts it away again once nothing is in reach.
- **Each swing knocks a creature back** as far as three arrows would, and breaks off a pounce it was starting.
- **A swing timer under his feet**, below health and arrows, fills as the next swing comes ready: 2 seconds for a one-handed weapon, 3 for a two-handed one.
- **Short blades are thrust, not swung.** With a dagger or a shortsword he holds it out at his side and stabs upward.
- **Both hunters start with a weapon:** the Alliance hunter a Pajama Hunter Shortsword, the Horde hunter a Horde Hunter Handaxe.
- **Thunderfury's lightning goes off with a melee blow too**, and strikes far more often than before, as a legendary's should.

## Loot: what comes from where
- **Set pieces only drop from bosses.** They no longer fall from the sky: beat the bosses to collect a set.
  - **Giantstalker** comes from the bosses of zones 4 and 5, **Dragonstalker** from zones 6 and 7, **Cryptstalker** from zones 8 to 10.
  - Each set comes in two halves. A set's first boss drops the smaller pieces (bracers, gloves, belt, boots), the second boss the larger ones (helmet, shoulders, chest, legs).
  - The chance is 50% a kill for Giantstalker, 40% for Dragonstalker and 30% for Cryptstalker, always a piece you don't have yet.
- **Ashkandi, Ashjre'thul and the other epic weapons and rings no longer fall.** The bosses of zones 5 to 10 drop them now and then in place of their own purple item.
- **Every zone has gear of its own**: 52 rings, necklaces, trinkets, cloaks and weapons in all, on both sides. Its creatures carry it, it falls in the zone now and then (the greens more often than the blues), and the zone's boss may drop it in place of its own item. The Items page lists all of it, zone by zone.
- **Bosses drop bags.** From zone 4, a boss may drop a bag, bigger in later zones, up to 14 slots. It goes straight on, into a free bag slot or in place of a smaller bag.
- **The large quiver drops from zone 4 on.**
- **The Bindings of the Windseeker drop at last**: the Left Binding from the zone 9 boss, the Right Binding from the zone 10 boss. Thunderfury is made from both.
- **Boss loot pops out of the boss** as it falls, like a creature's. It's already yours; catching it is just the fun part.

## The Frost Trap
- **A new power-up**, falling in zones with creatures. Catch it and three traps are set across the field, where the creatures come down at you.
- **A creature that walks into a trap is frozen in place** for six seconds: it can't close in or pounce while you shoot it. A pounce already in the air still lands.
- **Unsprung traps stay for the whole game**, through zones and boss fights. Bosses never set them off.
- **Up to six traps at a time.** With no room for three more, the pickup falls on past you, so you don't waste it.

## Boss fights
- **Help falls during every boss fight**, every 8 to 14 seconds: Haste, a Power Word: Shield, or Reverse Gravity, which sends everything the boss throws flying up and away.
- **The shield a boss fight drops is a quick one**: it takes one hit and lasts two seconds. Time it for the charge or the stomp you can't get out of.
- **Power Word: Shield has charges everywhere.** It blocks 3 hits or lasts its time, whichever runs out first; a tougher creature's bite uses two.
- **Multishot has diminishing returns on a boss.** Of one Multishot's arrows, the first three hit in full, the fourth for 25% and the fifth for 5%. Getting in close is still rewarded, just not unboundedly.
- **King Bangalash and the other big cats** are no easier to hit than the other bosses.

## Your bags and his 36
- **His 36 now hold the gear he carries besides what he wears.** What he wears takes no room. Take a piece off and it goes into his 36 (or to the bank if they're full); put one on and its place frees up.
- **Gear can be kept in your bags too**, a slot a piece. It takes room your materials could have used, so you choose what matters more.
- **Move gear right from the Bags tab.** Pick a piece on him, in his 36 or in your bags, then:
  - **Put on** wears it straight away;
  - **To his 36**, **To bags** or **To the bank** moves it;
  - **Switch for…** trades a worn piece for one in his 36 or your bags that fits the same slot;
  - **All to bags** takes everything off at once.
- **The bank shows your gear** beside your materials, with buttons to bring a piece back.
- **Caught gear finds a home on its own**: on him if the slot is free, else his 36, else a bag, else the bank. A piece put on by itself tells you so.

## Playing as a guest
- **Guests now keep everything they find**: gear, set pieces, his 36, the bank and materials, for as long as your browser keeps your session and you play at least once a week.
- **Come back and you're welcomed** to the session you're continuing, with what's in it, or you can start fresh.
- **Sign up and it all comes with you.** Log in to an account you already have and you can bring a guest session's finds over, each hunter's to his own.
- **Coins earned as a guest** are kept for you and can be spent once you sign up.

## A cleaner screen
- **The panels are slimmer and out of the way.** Top left: your name, a level bar and your score, with small chips for coins and full bags. Top right: the set you wear most of and how far along it is.
- **Open your stats with I and what you wear with G.** Both close by themselves when a boss comes in. Both keys can be changed in Settings.
- **One row for everything with a timer**, such as Haste, Reverse Gravity and the shield, instead of cards in the corner and banners at the top.
- **What you find shows briefly** under the top-left panel, then fades.
- **Nothing written across the field**: the dodge area is now just a faint line.
- **Health, arrows and the swing timer sit under your hunter's feet** in rows, and the arrow count sits beside the health bar.
- **The panels fit any window**: they sit beside the field, or just inside its corners, on small screens, ultrawide monitors and tall windows alike.

## Smoother play
- **Fewer hitches**: from the mouse, from panels redrawing every frame, from Thunderfury's lightning, and from creature pictures loading as a zone's first creature appears.
- **Redrawn clothes and creatures show at once** after an update, instead of an old copy from your browser.
- **No square frames** round the helpful spells that fall: Frost Nova, Power Word: Shield and the others.

## Smaller things
- **Necklaces sit on the neck**, the **Onslaught Girdle** sits properly on the Horde hunter's waist, and the Alliance starter boots fit.
- **Nobody starts bare**: your hunter is always dressed in at least his starting clothes.
- **The large quiver says what it gives**, in the inventory and on the character sheet.
- **The site's menu is grouped** into Play, Scores and Guide.

## How the game runs on your computer
To find and fix slowdowns, one game in twenty now quietly sends us a short summary every 30 seconds of how smoothly it ran: the frame rate, what was going on in the game (the level, a boss fight), and the kind of device and browser it ran on (graphics card, screen size, system). If you're logged in, the summary is linked to your account so we can look into a problem you report. The summaries are deleted after 30 days.
MARKDOWN;
};
