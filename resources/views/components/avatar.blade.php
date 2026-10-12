@props(['user' => null, 'name' => null])

@php
    $name = $name ?? $user?->name ?? '?';
    $url = $user?->avatarUrl();
@endphp

{{-- A player's picture in a round gold frame; their initial when they have none. Size it with a class. --}}
<span {{ $attributes->merge(['class' => 'avatar']) }}>
    @if ($url)
        <img src="{{ $url }}" alt="" loading="lazy">
    @else
        <span aria-hidden="true">{{ mb_strtoupper(mb_substr($name, 0, 1)) }}</span>
    @endif
</span>
