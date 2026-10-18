<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Laravel') }}</title>

        @include('layouts.favicons')

        @include('layouts.social')

        @include('layouts.analytics')

        @include('layouts.fonts')

        <!-- Scripts -->
        @vite(['resources/css/app.css', 'resources/js/app.js'])

        {{-- A page's own styles and scripts (a tool's page, for one) --}}
        @stack('head')
    </head>
    <body class="font-sans antialiased">
        <div class="min-h-screen flex flex-col bg-gray-100">
            @include('layouts.navigation')

            <!-- Page Heading -->
            @isset($header)
                @php
                    // The other pages of this page's category, as tabs under its heading
                    $siteCategory = \App\Support\SiteMenu::current();
                    $siteTabs = $siteCategory ? \App\Support\SiteMenu::pages($siteCategory) : [];
                @endphp
                <header class="bg-white shadow">
                    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 {{ count($siteTabs) > 1 ? '!pb-0' : '' }}">
                        {{ $header }}
                        @if (count($siteTabs) > 1)
                            <nav class="site-tabs mt-4 flex flex-wrap gap-x-1" aria-label="{{ \App\Support\SiteMenu::categories()[$siteCategory]['label'] }}">
                                @foreach ($siteTabs as $tab)
                                    @php $here = \App\Support\SiteMenu::isOn($tab); @endphp
                                    <a href="{{ route($tab['route']) }}" class="site-tab {{ $here ? 'is-on' : '' }}" @if ($here) aria-current="page" @endif>{{ $tab['label'] }}</a>
                                @endforeach
                            </nav>
                        @endif
                    </div>
                </header>
            @endisset

            <!-- Page Content -->
            <main class="flex-1">
                {{ $slot }}
            </main>

            @include('layouts.footer')
        </div>
    </body>
</html>
