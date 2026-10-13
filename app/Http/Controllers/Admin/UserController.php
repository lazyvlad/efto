<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Avatar;
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
            'pieces' => count($user->setPieces()),
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
