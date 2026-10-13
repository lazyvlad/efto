<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        @include('layouts.favicons')

        @include('layouts.social')

        @include('layouts.fonts')

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    </head>
    <body class="font-sans antialiased">
        <div class="min-h-screen flex flex-col">
            <div class="flex-1 flex flex-col sm:justify-center items-center pt-6 sm:pt-0 pb-6">
                <div>
                    <a href="{{ route('home') }}">
                        <x-application-logo class="text-3xl" />
                    </a>
                </div>

                <div class="panel w-full sm:max-w-md mt-6 px-6 py-5 overflow-hidden">
                    {{ $slot }}
                </div>

                <a href="{{ route('home') }}" class="mt-5 text-sm text-gray-600 hover:text-gray-900 underline">
                    {{ __('Back to the game') }}
                </a>
            </div>

            @include('layouts.footer')
        </div>
    </body>
</html>
