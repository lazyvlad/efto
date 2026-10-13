<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * A blocked account is logged out wherever it turns up, however it logged in. The player can
 * still play as a guest.
 */
class RejectBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isBlocked()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                abort(403, 'This account has been blocked.');
            }

            return redirect()->route('login')->withErrors(['email' => __('This account has been blocked.')]);
        }

        return $next($request);
    }
}
