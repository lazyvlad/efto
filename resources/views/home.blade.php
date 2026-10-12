<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        <link rel="icon" href="{{ asset('favicon.ico') }}">

        @include('layouts.fonts')

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans antialiased overflow-hidden">
        {{-- The site header, and the game filling whatever is left of the window. The game is a
             page of its own (it sizes itself to its window), so it sits in a frame. --}}
        <div class="h-screen h-dvh flex flex-col" x-data="gameGuard" @keydown.escape.window="asking && stay()">
            {{-- While a game is underway, header links ask before leaving (see game-guard.js) --}}
            <div class="relative z-20 shrink-0" @click.capture="intercept($event)">
                @include('layouts.navigation')
            </div>

            <iframe
                x-ref="frame"
                src="{{ route('play', ['embedded' => 1]) }}"
                title="{{ config('app.name') }}"
                class="flex-1 min-h-0 w-full border-0 bg-black"
                allow="autoplay; fullscreen"
                onload="this.contentWindow.focus()"
            ></iframe>

            <div
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
                x-show="asking"
                x-cloak
                role="dialog"
                aria-modal="true"
                aria-labelledby="leave-game-title"
            >
                <div class="panel w-full max-w-sm px-6 py-5 text-center" @click.outside="asking && stay()">
                    <h2 id="leave-game-title" class="text-xl text-gray-900">{{ __('Leave the game?') }}</h2>

                    <p class="mt-2 text-sm text-gray-600">
                        {{ __('Your game is paused. If you leave this page, it will be lost.') }}
                    </p>

                    <div class="mt-5 flex justify-center gap-3">
                        <x-primary-button type="button" x-ref="stay" @click="stay()">{{ __('Keep playing') }}</x-primary-button>
                        <x-secondary-button @click="leave()">{{ __('Leave') }}</x-secondary-button>
                    </div>
                </div>
            </div>
        </div>
    </body>
</html>
