<x-mail::message>
# {{ __('Reset your password') }}

{{ __('Hello :name, someone asked to reset the password of your account. If that was you, choose a new one here:', ['name' => $name]) }}

<x-mail::button :url="$url">
{{ __('Choose a new password') }}
</x-mail::button>

{{ __('The link works for :minutes minutes.', ['minutes' => $minutes]) }}

{{ __('If you did not ask for this, nothing has changed and you can ignore this email. Your password stays as it is.') }}

<x-slot:subcopy>
{{ __('If the button does not work, copy this address into your browser:') }} <span class="break-all">[{{ $url }}]({{ $url }})</span>
</x-slot:subcopy>
</x-mail::message>
