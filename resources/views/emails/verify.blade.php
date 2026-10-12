<x-mail::message>
# {{ __('Welcome, :name', ['name' => $name]) }}

{{ __('Your account is registered. One step is left: confirm that this email address is yours.') }}

<x-mail::button :url="$url">
{{ __('Activate my account') }}
</x-mail::button>

{{ __('You can play right away, and everything you earn is kept: coins, boss loot, set pieces. Activating the account is what lets you use them: spending coins, wearing your sets, carrying the large quiver.') }}

{{ __('The link works for :minutes minutes. If it has run out, log in and ask for a new one.', ['minutes' => $minutes]) }}

{{ __('If you did not create an account, you can ignore this email.') }}

<x-slot:subcopy>
{{ __('If the button does not work, copy this address into your browser:') }} <span class="break-all">[{{ $url }}]({{ $url }})</span>
</x-slot:subcopy>
</x-mail::message>
