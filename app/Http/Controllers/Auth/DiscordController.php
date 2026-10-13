<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Discord;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Discord as a way in. A player who is logged in connects their Discord account, which
 * activates theirs (User::canUseRewards()). A visitor who is not logs in with Discord, and an
 * account is made for them the first time.
 */
class DiscordController extends Controller
{
    /**
     * Send the player to Discord to approve.
     */
    public function redirect(Request $request): RedirectResponse
    {
        abort_unless(Discord::enabled(), 404);

        $state = Str::random(40);
        $request->session()->put('discord_state', $state);

        return redirect()->away(Discord::authorizeUrl($state));
    }

    /**
     * Discord sent the player back.
     */
    public function callback(Request $request): RedirectResponse
    {
        abort_unless(Discord::enabled(), 404);

        $state = $request->session()->pull('discord_state');
        $back = $request->user() ? 'profile.edit' : 'login';

        // Declined on Discord's page, or an answer that is not to a question this visitor asked
        if (! $request->filled('code') || ! $state || ! hash_equals($state, (string) $request->query('state'))) {
            return redirect()->route($back)->with('discord', __('Discord was not connected. Please try again.'));
        }

        $account = Discord::account($request->query('code'));

        if (! $account) {
            return redirect()->route($back)->with('discord', __('Discord did not answer. Please try again.'));
        }

        return $request->user()
            ? $this->connect($request->user(), $account)
            : $this->logIn($request, $account);
    }

    /**
     * A logged-in player connects their Discord account.
     *
     * @param  array{id: string, name: string, email: ?string}  $account
     */
    private function connect(User $user, array $account): RedirectResponse
    {
        if (User::where('discord_id', $account['id'])->whereKeyNot($user->id)->exists()) {
            return redirect()->route('profile.edit')
                ->with('discord', __('That Discord account is already connected to another account here.'));
        }

        $user->forceFill(['discord_id' => $account['id'], 'discord_name' => $account['name']])->save();

        return redirect()->route('profile.edit')
            ->with('discord', __('Discord connected. Your account is activated.'));
    }

    /**
     * A visitor logs in with Discord: into the account connected to it, or the one with the
     * email address Discord vouches for, or a new one.
     *
     * @param  array{id: string, name: string, email: ?string}  $account
     */
    private function logIn(Request $request, array $account): RedirectResponse
    {
        $user = User::where('discord_id', $account['id'])->first();

        if (! $user && ! $account['email']) {
            return redirect()->route('register')->with('discord', __(
                'Your Discord account has no verified email address. Register here first, then connect Discord from your profile.'
            ));
        }

        if (! $user && ($user = User::where('email', $account['email'])->first())) {
            // Nobody has proved this address is theirs here, so whoever registered it may not
            // be this player: the password they chose stops working
            if (! $user->hasVerifiedEmail()) {
                $user->password = Hash::make(Str::random(40));
            }
        }

        $user ??= new User([
            'name' => Str::limit($account['name'], 255, ''),
            'email' => $account['email'],
            'password' => Hash::make(Str::random(40)),
        ]);

        $user->forceFill(['discord_id' => $account['id'], 'discord_name' => $account['name']]);

        // Discord has checked the address, so there is no need to check it again
        if ($account['email'] === $user->email && ! $user->hasVerifiedEmail()) {
            $user->email_verified_at = now();
        }

        $user->save();

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('home', absolute: false));
    }
}
