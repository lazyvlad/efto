<?php

namespace App\Http\Controllers;

use App\Support\Bags;
use App\Support\BossLoot;
use App\Support\Fingerprint;
use App\Support\GameSettings;
use App\Support\Gear;
use App\Support\GuestName;
use App\Support\GuestHunter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Vite;
use Illuminate\View\View;
use Throwable;

class GameController extends Controller
{
    /**
     * The landing page: the site header with the game in a frame under it.
     */
    public function home(): View
    {
        return view('home');
    }

    /**
     * Serve the game. The game is a self-contained front-end (built into public/game); this
     * hands it the page it expects plus what it needs to know about the visitor.
     */
    public function play(Request $request): Response
    {
        // public/game-src is a development link to the unbuilt source in game/
        $folder = config('game.serve') === 'source' ? 'game-src' : 'game';
        $indexPath = public_path($folder.'/index.html');

        abort_unless(
            is_file($indexPath),
            503,
            $folder === 'game'
                ? 'The game has not been built. Run "npm run build:game".'
                : 'public/game-src is missing. See "Development" in the README.'
        );

        // A visitor plays as a guest account of his own, kept as long as his browser keeps its
        // key (App\Support\GuestHunter). One coming back is told he is continuing it, once a
        // visit; one logged in with a guest account still in the browser is asked whether to
        // bring it along.
        $user = $request->user();
        if ($user === null) {
            $user = GuestHunter::create($request);
            Auth::guard('web')->setUser($user);
            $request->attributes->set('guestHunter', 'new');
        }
        $welcomeBack = null;
        $guestMerge = null;
        if ($user->is_guest) {
            if ($request->attributes->get('guestHunter') === 'returning' && ! $request->session()->get('guest_welcomed')) {
                $welcomeBack = GuestHunter::summary($user);
                $request->session()->put('guest_welcomed', true);
            }
        } elseif ($guest = GuestHunter::fromRequest($request)) {
            if ($request->session()->get('guest_merge_left') !== $guest->id) {
                $guestMerge = GuestHunter::summary($guest);
            }
        }

        $boot = [
            // An account that is not activated yet earns but cannot use: its quiver and set
            // pieces are held back here, and skipping and Boss Rush below
            'user' => $user ? [
                'name' => $user->name,
                // A guest's account: he keeps what he finds, but needs an account to spend coins
                'guest' => (bool) $user->is_guest,
                'avatar' => $user->avatarUrl(),
                'coins' => (int) $user->coins,
                'verified' => $user->canUseRewards(),
                'quiver' => $user->keepsLoot() && $user->quiver,
                // Each hunter's own set pieces, and below his other gear: { alliance, horde }
                'pieces' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => $user->keepsLoot() ? $user->setPieces($side) : []])->all(),
                // What the hunter is wearing, slot by slot (the game's character sheet)
                // (null until the player has chosen: the game then puts on what they own)
                // Each hunter's outfit, null for one never chosen (the game then dresses it in
                // what that side starts in)
                'equipment' => ! $user->keepsLoot() ? null : collect(Gear::allEquipment($user))->map(
                    fn ($chosen, $side) => $chosen === null ? null : (object) Gear::dressed($user, $chosen, $side)
                )->all(),
                // What each hunter takes into a game, of everything owned (null until chosen:
                // the game then takes what he wears and whatever else of his there is room for)
                'carried' => $user->carried === null || ! $user->keepsLoot()
                    ? null
                    : collect(Gear::allCarried($user))->map(
                        fn ($chosen, $side) => $chosen === null ? null : Gear::carried($user, $chosen, null, $side)
                    )->all(),
                // The sets saved on the character sheet, each hunter's own
                'outfits' => Gear::allOutfits($user),
                // What each hunter wears but is not drawn in
                'hidden' => Gear::allHidden($user),
                // The gear owned besides the sets, and how many of each (App\Support\Gear)
                'gear' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => (object) ($user->keepsLoot() ? Gear::owned($user, $side) : [])])->all(),
                // Of that, the copies bound to each hunter (the rest, gear that binds when worn,
                // can be sent to the other)
                'bound' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => (object) ($user->keepsLoot() ? Gear::bound($user, $side) : [])])->all(),
                // The bags bought (their sizes), what is in them between games, and the bank of
                // materials and what is crafted from them (App\Support\Bags)
                'bags' => $user->keepsLoot() ? ($user->bags ?? []) : [],
                // ...each hunter his own: { alliance, horde } each
                'bagContents' => Bags::allKept($user)['bags'],
                // The gear each keeps in his bags besides his 36, a slot a piece
                'bagGear' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => $user->keepsLoot() ? Gear::bagGear($user, $side) : []])->all(),
                'materials' => Bags::allKept($user)['bank'],
                // The bosses the player has beaten: the ones they may fight again on their own
                'bosses' => $user->bossDrops()->distinct()->pluck('boss_id')->all(),
            ] : null,
            'guestName' => $user->is_guest ? $user->name : null,
            // A guest coming back: what he is continuing with (App\Support\GuestHunter::summary)
            'welcomeBack' => $welcomeBack,
            // Logged in with a guest account in this browser: what it would bring along
            'guestMerge' => $guestMerge,
            // Skipping ahead: the price per zone and the furthest zone open to the player on each side
            'skip' => $user?->canUseRewards() ? [
                'costPerZone' => (int) config('boss_loot.skip_cost_per_zone'),
                'unlocked' => [
                    'alliance' => BossLoot::unlockedZone($user, 'alliance'),
                    'horde' => BossLoot::unlockedZone($user, 'horde'),
                ],
            ] : null,
            // Boss Rush: what a logged-in player pays to enter
            'rush' => $user?->canUseRewards() ? ['fee' => (int) config('boss_loot.rush.entry_fee')] : null,
            // Everything that can be worn besides the sets: where, what it gives, what it sells for
            'gear' => (object) Gear::catalog(),
            // Bags that can be bought: size in slots => price in copper
            'bagsForSale' => (object) config('loot.bags.for_sale'),
            // What can be crafted, from what (config/crafting.php)
            'crafting' => ['items' => (object) config('crafting.items'), 'recipes' => (object) config('crafting.recipes')],
            // Settings changed in the admin section, by their place in the game's gameConfig
            'settings' => (object) app(GameSettings::class)->forGame(),
            'csrfToken' => csrf_token(),
            // The share of games that send how they run (utils/perfProbe.js)
            'perfShare' => (float) config('game.perf_share'),
            // Framed by the landing page, whose header already has the account links
            'embedded' => $request->boolean('embedded'),
            'urls' => [
                'scores' => route('scores.index'),
                'games' => route('games.open'),
                'collection' => route('collection'),
                'equipment' => route('equipment.update'),
                // Debug mode's measurements (only sent with ?debug=perf)
                'perf' => route('perf.store'),
                'outfits' => route('outfits.update'),
                'bags' => route('bags.buy'),
                'bagsMove' => route('bags.move'),
                'bagsSend' => route('bags.send'),
                'gearSend' => route('gear.send'),
                'craft' => route('craft'),
                'sell' => route('vendor.sell'),
                'verify' => route('verification.notice'),
                'history' => route('games.history'),
                'login' => route('login'),
                'register' => route('register'),
                'logout' => route('logout'),
                'guestForget' => route('guest.forget'),
                'guestMerge' => route('guest.merge'),
                'profile' => route('profile.edit'),
            ],
        ];

        // The game's own files are addressed relative to its folder: the built game's in the S3
        // bucket when there is one (config game.asset_url). Pictures from there are fetched as
        // cross-origin requests the bucket allows (its CORS rules), or the game could not read
        // their pixels (utils/hitMask.js) nor make its hunter's picture from them.
        $assets = $folder === 'game' ? config('game.asset_url') : '';
        $head = ($assets !== ''
                ? '<base href="'.e($assets).'/">'."\n"
                    .'    <script>'.self::CROSS_ORIGIN_PICTURES.'</script>'."\n"
                : '<base href="'.e(asset($folder)).'/">'."\n")
            .'    <script>window.INPUT_BOOT = '
            .json_encode($boot, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES)
            .';</script>'."\n    "
            // The card shown when the game's address is posted in a chat or on social media
            .trim(view('layouts.social')->render())
            // Counted once: framed by the landing page, that page has already counted the visit
            .($request->boolean('embedded') ? '' : "\n    ".trim(view('layouts.analytics')->render()));

        $html = preg_replace('/<head(\s[^>]*)?>/i', "$0\n    ".$head, $this->fingerprinted($folder, $this->hashed($folder, file_get_contents($indexPath))), 1);
        if ($assets !== '') {
            // The page's own pictures as well: a browser that cached one fetched without CORS
            // would refuse it to the game's cross-origin request for the same address
            $html = preg_replace('/<img\b(?![^>]*\bcrossorigin)/i', '<img crossorigin="anonymous"', $html);
        }

        return response($html)
            ->header('Content-Type', 'text/html; charset=utf-8')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    /** Every picture the game makes is asked for as a cross-origin request */
    private const CROSS_ORIGIN_PICTURES = "(function(){var P=window.Image;function I(w,h){var i=new P(w,h);i.crossOrigin='anonymous';return i}"
        ."I.prototype=P.prototype;window.Image=I;var make=document.createElement.bind(document);"
        ."document.createElement=function(t,o){var e=make(t,o);if(String(t).toLowerCase()==='img')e.crossOrigin='anonymous';return e}})();";

    /** The game's files whose names never change, which its page links to */
    private const FIXED_NAMES = [
        'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png',
        'site.webmanifest', 'assets/ui/input-logo.webp',
    ];

    /**
     * The game's page with its logo, icons and manifest fingerprinted (App\Support\Fingerprint),
     * so a browser fetches them again when they change rather than keeping an older copy.
     */
    private function fingerprinted(string $folder, string $html): string
    {
        // With its pictures in the S3 bucket the page's base is there: the icons and the
        // manifest, which are not uploaded, are linked to here in full
        $elsewhere = $folder === 'game' && config('game.asset_url') !== '';
        foreach (self::FIXED_NAMES as $name) {
            $version = Fingerprint::of(public_path($folder.'/'.$name));
            $address = $elsewhere && ! str_starts_with($name, 'assets/') ? asset($folder.'/'.$name) : $name;
            if ($version !== '') {
                $address .= '?v='.$version;
            }
            $html = str_replace('"'.$name.'"', '"'.$address.'"', $html);
        }

        return $html;
    }

    /**
     * The built game's page with its scripts and styles taken from the site's own build
     * (Vite): one script and one stylesheet, each named after its contents, so every change
     * has an address no browser has seen and none can go on using an older copy. Pictures and
     * sounds keep their addresses in the game's folder.
     *
     * The unbuilt game (a development server) keeps the links of its own page.
     */
    private function hashed(string $folder, string $html): string
    {
        if ($folder !== 'game') {
            return $html;
        }

        try {
            $styles = Vite::asset('game/styles/game.css');
            $script = Vite::asset('game/game-modular.js');
        } catch (Throwable) {
            // The site was built without the game: the page's own links still work
            return $html;
        }

        // The stylesheets, as one, where the first of them was
        $html = preg_replace('/<link\b[^>]*\bhref="styles\/[^"]*"[^>]*>/i', '<link rel="stylesheet" href="'.e($styles).'">', $html, 1);
        $html = preg_replace('/\s*<link\b[^>]*\bhref="styles\/[^"]*"[^>]*>/i', '', $html);

        return preg_replace(
            '/<script\b[^>]*\bsrc="game-modular[^"]*"[^>]*><\/script>/i',
            '<script type="module" src="'.e($script).'"></script>',
            $html,
            1
        );
    }
}
