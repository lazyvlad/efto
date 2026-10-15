<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Avatar;
use App\Support\BossLoot;
use App\Support\Gear;
use App\Support\Grants;
use App\Support\LootTable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * The accounts: find one, see what it has, and put right what needs it.
 */
class UserController extends Controller
{
    public function index(Request $request): View
    {
        $search = trim((string) $request->query('q'));
        $show = $request->query('show');

        $users = User::query()
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('discord_name', 'like', "%{$search}%")))
            ->when($show === 'unactivated', fn ($q) => $q->whereNull('email_verified_at')->whereNull('discord_id'))
            ->when($show === 'discord', fn ($q) => $q->whereNotNull('discord_id'))
            ->when($show === 'blocked', fn ($q) => $q->whereNotNull('blocked_at'))
            ->when($show === 'admins', fn ($q) => $q->where('is_admin', true))
            ->withCount('games')
            ->withMax('games', 'started_at')
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return view('admin.users.index', ['users' => $users, 'search' => $search, 'show' => $show]);
    }

    public function show(User $user): View
    {
        return view('admin.users.show', [
            'user' => $user->loadCount(['games', 'bossDrops']),
            'best' => $user->games()->legal()->max('score'),
            // Each hunter: what he has, and what can be opened or given him from here
            // (App\Support\Grants)
            'sides' => collect(Gear::SIDES)->mapWithKeys(fn (string $faction) => [$faction => [
                'bosses' => count(config("boss_loot.bosses.$faction", [])),
                'openTo' => BossLoot::unlockedZone($user, $faction),
                'granted' => Grants::grantedBosses($user, $faction),
                'pieces' => count($user->setPieces($faction)),
                'sets' => LootTable::sets($user->setPieces($faction)),
                'grantedPieces' => $user->grantedPieces($faction),
                'gear' => array_sum(Gear::owned($user, $faction)),
                'grantedGear' => count(array_diff_key(Grants::grantedGear($user, $faction), [Gear::LARGE_QUIVER => 1])),
                // Crafted gear (Thunderfury): whether he has it, and whether it was given
                'crafted' => collect(config('gear.crafted', []))->map(fn (array $made, string $itemId) => [
                    'name' => $made['name'],
                    'has' => (Gear::owned($user, $faction)[$itemId] ?? 0) > 0,
                    'given' => (Grants::grantedGear($user, $faction)[$itemId] ?? 0) > 0,
                ])->all(),
                'quiver' => in_array($faction, Gear::quiverSides($user), true),
                'quiverGiven' => (Grants::grantedGear($user, $faction)[Gear::LARGE_QUIVER] ?? 0) > 0
                    || ($faction === 'alliance' && $user->quiver && $user->bossDrops()->where('quiver', true)->doesntExist()),
            ]]),
            'games' => $user->games()->withCount('bossDrops')->latest('started_at')->limit(15)->get(),
        ]);
    }

    /**
     * Activate an account by hand, for a player the email never reached.
     */
    public function activate(User $user): RedirectResponse
    {
        if (! $user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return back()->with('status', __(':name is activated.', ['name' => $user->name]));
    }

    /**
     * Set what is in the account's purse.
     */
    public function coins(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'gold' => ['required', 'integer', 'min:0', 'max:100000'],
            'silver' => ['required', 'integer', 'min:0', 'max:99'],
            'copper' => ['required', 'integer', 'min:0', 'max:99'],
        ]);

        $user->forceFill(['coins' => $data['gold'] * 10000 + $data['silver'] * 100 + $data['copper']])->save();

        return back()->with('status', __('The purse of :name was set.', ['name' => $user->name]));
    }

    public function block(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->withErrors(['user' => __('You cannot block your own account.')]);
        }

        $user->forceFill(['blocked_at' => now(), 'remember_token' => null])->save();

        return back()->with('status', __(':name is blocked.', ['name' => $user->name]));
    }

    public function unblock(User $user): RedirectResponse
    {
        $user->forceFill(['blocked_at' => null])->save();

        return back()->with('status', __(':name is no longer blocked.', ['name' => $user->name]));
    }

    /**
     * Open the zones of a side for the player, as far as the admin says: the bosses before
     * them are counted as beaten.
     */
    public function zones(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'faction' => ['required', 'in:'.implode(',', array_keys(config('boss_loot.bosses')))],
            'bosses' => ['required', 'integer', 'min:1', 'max:'.count(config('boss_loot.bosses.'.$request->input('faction'), [1]))],
        ]);

        Grants::beatBosses($user, $data['faction'], (int) $data['bosses']);

        return back()->with('status', __(':name may now start as far as zone :zone for the :side.', [
            'name' => $user->name,
            'zone' => BossLoot::unlockedZone($user, $data['faction']),
            'side' => ucfirst($data['faction']),
        ]));
    }

    /**
     * Take back the bosses counted as beaten on a side. What the player beat themselves stays.
     */
    public function lockZones(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'faction' => ['required', 'in:'.implode(',', array_keys(config('boss_loot.bosses')))],
        ]);

        Grants::takeBackBosses($user, $data['faction']);

        return back()->with('status', __('What was opened for :name on the :side side was taken back: they may start as far as zone :zone.', [
            'name' => $user->name,
            'side' => ucfirst($data['faction']),
            'zone' => BossLoot::unlockedZone($user, $data['faction']),
        ]));
    }

    /**
     * Give a hunter the large quiver, or take back the one given.
     */
    public function quiver(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['side' => ['required', 'in:alliance,horde'], 'take' => ['nullable', 'boolean']]);
        $take = (bool) ($data['take'] ?? false);
        Grants::giveQuiver($user, $data['side'], ! $take);

        return back()->with('status', $take
            ? __('The large quiver given to :name\'s :side hunter was taken back.', ['name' => $user->name, 'side' => ucfirst($data['side'])])
            : __(':name\'s :side hunter has the large quiver.', ['name' => $user->name, 'side' => ucfirst($data['side'])]));
    }

    /**
     * Give a hunter one of every piece of gear he can wear, or take back what was given.
     */
    public function gear(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'side' => ['required', 'in:alliance,horde'],
            'take' => ['nullable', 'boolean'],
            // One piece only (crafted gear, to try it), instead of one of everything
            'item' => ['nullable', 'string', 'in:'.implode(',', array_keys(config('gear.crafted', [])))],
        ]);
        $side = ucfirst($data['side']);

        if (isset($data['item'])) {
            $take = (bool) ($data['take'] ?? false);
            Grants::giveItem($user, $data['side'], $data['item'], ! $take);
            $name = Gear::catalog()[$data['item']]['name'];

            return back()->with('status', $take
                ? __(':item given to :name\'s :side hunter was taken back.', ['item' => $name, 'name' => $user->name, 'side' => $side])
                : __(':name\'s :side hunter has :item: put it on from the character sheet.', ['item' => $name, 'name' => $user->name, 'side' => $side]));
        }

        if ($data['take'] ?? false) {
            Grants::takeBackGear($user, $data['side']);

            return back()->with('status', __('The gear given to :name\'s :side hunter was taken back.', ['name' => $user->name, 'side' => $side]));
        }

        Grants::giveAllGear($user, $data['side']);

        return back()->with('status', __(':name\'s :side hunter has every piece of gear he can wear.', ['name' => $user->name, 'side' => $side]));
    }

    /**
     * Give every piece of a hunter set, or take back the pieces that were given.
     */
    public function set(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'set' => ['required', 'in:'.implode(',', array_keys(config('loot.sets')))],
            'side' => ['required', 'in:alliance,horde'],
            'take' => ['nullable', 'boolean'],
        ]);

        $name = config('loot.sets.'.$data['set'].'.name');
        $side = ucfirst($data['side']);

        if ($data['take'] ?? false) {
            Grants::takeBackSet($user, $data['set'], $data['side']);

            return back()->with('status', __('The given pieces of :set were taken back from :name\'s :side hunter.', ['set' => $name, 'name' => $user->name, 'side' => $side]));
        }

        Grants::giveSet($user, $data['set'], $data['side']);

        return back()->with('status', __(':name\'s :side hunter has every piece of :set.', ['name' => $user->name, 'set' => $name, 'side' => $side]));
    }

    /**
     * Everything at once, for both hunters or one: all zones, all boss loot and gear, the large
     * quiver, every set.
     */
    public function unlockAll(Request $request, User $user): RedirectResponse
    {
        $side = $request->validate(['side' => ['nullable', 'in:alliance,horde']])['side'] ?? null;
        Grants::everything($user, $side);

        return back()->with('status', $side
            ? __('Everything is :name\'s :side hunter\'s: every zone of his side, all his boss loot and gear, the large quiver and all the sets.', ['name' => $user->name, 'side' => ucfirst($side)])
            : __('Everything is open for both of :name\'s hunters: every zone, all the boss loot and gear of each side, the large quiver and all the sets.', ['name' => $user->name]));
    }

    /**
     * Give or take the admin section.
     */
    public function admin(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->withErrors(['user' => __('You cannot take the admin section from yourself.')]);
        }

        $user->forceFill(['is_admin' => ! $user->is_admin])->save();

        return back()->with('status', $user->is_admin
            ? __(':name is now an admin.', ['name' => $user->name])
            : __(':name is no longer an admin.', ['name' => $user->name]));
    }

    /**
     * Delete the account. Its games and scores stay, no longer tied to anyone; its boss loot
     * goes with it.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->withErrors(['user' => __('Delete your own account from your profile.')]);
        }

        $request->validate(['confirm' => ['required', 'in:'.$user->email]], [
            'confirm.*' => __('Type the email address of the account to delete it.'),
        ]);

        Avatar::remove($user);
        $user->delete();

        return redirect()->route('admin.users.index')->with('status', __('The account of :name was deleted.', ['name' => $user->name]));
    }
}
