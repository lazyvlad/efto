@props(['input', 'related' => []])

@php
    // The length the server enforces (see AppServiceProvider)
    $minLength = 12;
@endphp

{{-- Strength meter under a new-password field. Advice only; the server has the final say. --}}
<div
    x-data="passwordStrength({ input: @js($input), related: @js($related), minLength: {{ $minLength }} })"
    {{ $attributes->merge(['class' => 'mt-2 text-sm']) }}
    aria-live="polite"
>
    <div class="flex gap-1" aria-hidden="true">
        @foreach ([1, 2, 3, 4] as $step)
            <div
                class="h-1.5 flex-1 rounded-full bg-gray-200 transition-colors"
                :class="score !== null && Math.max(score, 1) >= {{ $step }}
                    ? { 'bg-red-500': score <= 1, 'bg-amber-500': score === 2, 'bg-indigo-600': score === 3, 'bg-green-600': score === 4 }
                    : {}"
            ></div>
        @endforeach
    </div>

    <p class="mt-1.5 text-gray-600" x-show="score !== null" x-cloak>
        {{ __('Strength:') }}
        <span
            class="font-medium"
            :class="{ 'text-red-400': score <= 1, 'text-amber-500': score === 2, 'text-indigo-600': score === 3, 'text-green-600': score === 4 }"
            x-text="label"
        ></span>
        <span x-show="hint" x-text="'– ' + hint"></span>
    </p>

    <p class="mt-1.5" :class="longEnough ? 'text-green-600' : 'text-gray-500'">
        <span x-text="longEnough ? '✓' : '•'" aria-hidden="true"></span>
        {{ __('At least :count characters. A few unrelated words make a good password.', ['count' => $minLength]) }}
    </p>
</div>
