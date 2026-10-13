{{-- A link that starts Discord's approval page. Shows nothing until a Discord application is
     set up (App\Support\Discord). --}}
@if (\App\Support\Discord::enabled())
    <a href="{{ route('discord.redirect') }}" {{ $attributes->merge(['class' => 'btn btn-discord']) }}>
        {{ $slot }}
    </a>
@endif
