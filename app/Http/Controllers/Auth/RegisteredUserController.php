<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\GuestHunter;
use Closure;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): View
    {
        return view('auth.register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults(), $this->notPersonal($request)],
        ]);

        // A guest with a guest account in this browser signs up with all it found
        // (App\Support\GuestHunter)
        $guest = GuestHunter::fromRequest($request);
        if ($guest) {
            $user = GuestHunter::adopt($guest, $request->name, $request->email, Hash::make($request->password));
            GuestHunter::forgetCookie();
        } else {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('home', absolute: false));
    }

    /**
     * A password built from the account's own name or email address is the first thing
     * someone would guess.
     */
    private function notPersonal(Request $request): Closure
    {
        $words = preg_split('/[\s@._-]+/', mb_strtolower($request->string('name').' '.$request->string('email')));
        $words = array_filter($words, fn (string $word) => mb_strlen($word) > 3);

        return function (string $attribute, mixed $value, Closure $fail) use ($words) {
            foreach ($words as $word) {
                if (str_contains(mb_strtolower((string) $value), $word)) {
                    $fail(__('The password must not contain your name or email address.'));

                    return;
                }
            }
        };
    }
}
