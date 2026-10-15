<?php

namespace App\Http\Controllers;

use App\Support\GuestHunter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * A guest's account (App\Support\GuestHunter): left behind for a fresh start, or brought to
 * the account the guest logged in to.
 */
class GuestController extends Controller
{
    /**
     * "Start fresh": the guest's hunters and all they found are let go, and the browser forgets
     * the key. His games stay on the leaderboard under the name he played as.
     */
    public function forget(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user?->is_guest) {
            $user->delete();
        }
        GuestHunter::forgetCookie();

        return response()->json(['forgotten' => true]);
    }

    /**
     * Logged in with a guest account still in this browser: bring what it found to this account
     * ("bring": true), or leave it there for now, to go back to after logging out.
     */
    public function merge(Request $request): JsonResponse
    {
        $data = $request->validate(['bring' => ['required', 'boolean']]);
        $user = $request->user();
        abort_if($user->is_guest, 422, 'Log in first.');

        $guest = GuestHunter::fromRequest($request);
        abort_if($guest === null, 422, 'There is no guest account in this browser.');

        if (! $data['bring']) {
            $request->session()->put('guest_merge_left', $guest->id);

            return response()->json(['merged' => false]);
        }

        GuestHunter::mergeInto($guest, $user);
        GuestHunter::forgetCookie();

        return response()->json(['merged' => true]);
    }
}
