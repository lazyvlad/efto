<?php

namespace App\Providers;

use App\Support\GameSettings;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(GameSettings::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The game settings changed in the admin section, over the ones in the config files
        $this->app->make(GameSettings::class)->apply();

        // Passwords: long rather than complicated. No forced symbols or capitals; at least 12
        // characters, and not one that appears in known data breaches (checked against
        // haveibeenpwned.com without sending the password itself). The forms show a strength
        // meter on top of this.
        Password::defaults(function () {
            $rule = Password::min(12);

            // The breach check calls an outside service; tests must not depend on it
            return $this->app->runningUnitTests() ? $rule : $rule->uncompromised();
        });
    }
}
