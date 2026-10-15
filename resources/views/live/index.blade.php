<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Live games') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-4">
            <p class="px-4 sm:px-0 text-sm text-gray-500">
                {{ __('The games being played right now. Each game tells the site how it is going every half a minute or so, and when a boss goes down; this page keeps itself up to date.') }}
            </p>

            <div id="live-games" data-url="{{ route('live', ['list' => 1]) }}">
                @include('live.list')
            </div>
        </div>
    </div>

    <script>
        // Asks again every 10 seconds, while the page is in view
        (() => {
            const holder = document.getElementById('live-games');
            const refresh = () => {
                if (document.hidden) return;
                fetch(holder.dataset.url, { headers: { 'Accept': 'text/html' }, credentials: 'same-origin' })
                    .then(response => response.ok ? response.text() : null)
                    .then(html => { if (html !== null) holder.innerHTML = html; })
                    .catch(() => {});
            };
            setInterval(refresh, 10000);
            document.addEventListener('visibilitychange', refresh);
        })();
    </script>
</x-app-layout>
