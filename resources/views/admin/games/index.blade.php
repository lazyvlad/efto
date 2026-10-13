<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Games')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            @include('admin.filters', [
                'route' => 'admin.games.index',
                'placeholder' => __('Player name'),
                'choices' => [
                    'leaderboard' => __('On the leaderboard'),
                    'guests' => __('By guests'),
                    'rush' => __('Boss Rush'),
                    'offline' => __('Ran without the server'),
                ],
            ])

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                @if ($games->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('No games match.') }}</p>
                @else
                    @include('admin.games.rows', ['games' => $games, 'withScores' => true])
                @endif
            </div>

            {{ $games->links() }}
        </div>
    </div>
</x-app-layout>
