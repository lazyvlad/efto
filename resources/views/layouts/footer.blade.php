{{-- The small bar at the bottom of every page: whose site this is and who supports it --}}
<footer class="shrink-0 bg-white border-t border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-4 text-xs text-gray-500">
        <span>
            &copy; {{ date('Y') }} {{ config('app.name') }}
            <a href="{{ route('about') }}" class="ms-3 text-gray-700 hover:text-gray-900 underline">{{ __('About') }}</a>
            <a href="{{ route('items') }}" class="ms-3 text-gray-700 hover:text-gray-900 underline">{{ __('Items') }}</a>
        </span>

        <span>
            {{ __('Supported by') }}
            <a
                href="https://barkoder.com"
                target="_blank"
                rel="noopener noreferrer"
                class="text-gray-700 hover:text-gray-900 underline"
            >barKoder</a>
        </span>
    </div>
</footer>
