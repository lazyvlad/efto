{{-- What came back from a trip to Discord (Auth\DiscordController) --}}
@if (session('discord'))
    <div {{ $attributes->merge(['class' => 'font-medium text-sm text-amber-600']) }}>
        {{ session('discord') }}
    </div>
@endif
