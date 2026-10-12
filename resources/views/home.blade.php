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
        <div class="h-screen h-dvh flex flex-col">
            @include('layouts.navigation')

            <iframe
                src="{{ route('play', ['embedded' => 1]) }}"
                title="{{ config('app.name') }}"
                class="flex-1 min-h-0 w-full border-0 bg-black"
                allow="autoplay; fullscreen"
                onload="this.contentWindow.focus()"
            ></iframe>
        </div>
    </body>
</html>
