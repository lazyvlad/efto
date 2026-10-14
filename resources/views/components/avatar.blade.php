@props(['user' => null, 'name' => null, 'side' => null])

@php
    $name = $name ?? $user?->name ?? '?';
    // Their own picture; failing that, the hunter of the side they played (when it is known)
    $url = $user?->avatarUrl() ?? \App\Support\HunterPortrait::url($side);
@endphp

{{-- A player's picture in a round gold frame; their hunter or their initial when they have none. Size it with a class. --}}
<span {{ $attributes->merge(['class' => 'avatar']) }}>
    @if ($url)
        <img src="{{ $url }}" alt="" loading="lazy">
    @else
        <span aria-hidden="true">{{ mb_strtoupper(mb_substr($name, 0, 1)) }}</span>
    @endif
</span>
