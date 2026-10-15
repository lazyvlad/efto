<?php

namespace App\Http\Middleware;

use App\Support\GuestHunter;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * On the game's page and its requests, a visitor whose browser holds a guest key plays as that
 * guest's account (App\Support\GuestHunter), for this request only: he is not logged in, and the
 * rest of the site still sees a visitor. Someone logged in plays as himself.
 */
class ResolveGuestHunter
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('web')->check() && ($guest = GuestHunter::fromRequest($request))) {
            Auth::guard('web')->setUser($guest);
            $request->attributes->set('guestHunter', 'returning');
        }

        return $next($request);
    }

    /** He was never logged in: nothing of him stays behind the request */
    public function terminate(Request $request, Response $response): void
    {
        if ($request->attributes->has('guestHunter')) {
            Auth::guard('web')->forgetUser();
        }
    }
}
