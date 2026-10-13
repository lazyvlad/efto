<section>
    <header>
        <h2 class="text-lg font-medium text-gray-900">
            {{ __('Discord') }}
        </h2>

        <p class="mt-1 text-sm text-gray-600">
            @if ($user->discord_id)
                {{ __('Connected as :name. You can log in with Discord, and your account is activated.', ['name' => $user->discord_name]) }}
            @else
                {{ __('Connect your Discord account to log in with it. Connecting also activates your account, without the email.') }}
            @endif
        </p>
    </header>

    <x-discord-status class="mt-4" />

    @unless ($user->discord_id)
        <x-discord-button class="mt-6">{{ __('Connect Discord') }}</x-discord-button>
    @endunless
</section>
