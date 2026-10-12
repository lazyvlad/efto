<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('My Games') }}
        </h2>
    </x-slot>

    @php
        $duration = fn (int $seconds) => $seconds >= 3600
            ? sprintf('%dh %02dm', intdiv($seconds, 3600), intdiv($seconds % 3600, 60))
            : sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @if ($games->isEmpty())
                <div class="bg-white shadow sm:rounded-lg">
                    <p class="p-8 text-center text-gray-600">
                        {{ __('No games yet.') }}
                        <a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Play your first.') }}</a>
                    </p>
                </div>
            @else
                <div class="bg-white shadow sm:rounded-lg grid grid-cols-3 divide-x divide-gray-200 text-center">
                    <div class="p-4">
                        <div class="text-2xl tabular-nums text-indigo-600">{{ number_format($stats['played']) }}</div>
                        <div class="text-sm text-gray-500">{{ __('Games that count') }}</div>
                    </div>
                    <div class="p-4">
                        <div class="text-2xl tabular-nums text-indigo-600">{{ number_format($stats['best']) }}</div>
                        <div class="text-sm text-gray-500">{{ __('Best score') }}</div>
                    </div>
                    <div class="p-4">
                        <div class="text-2xl tabular-nums text-indigo-600">{{ $duration($stats['seconds']) }}</div>
                        <div class="text-sm text-gray-500">{{ __('Time played') }}</div>
                    </div>
                </div>

                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">
                        {{ __('Collection') }}
                        <span class="text-sm text-gray-500 ms-2">{{ __(':found of :total found', ['found' => $found->count(), 'total' => count($catalog)]) }}</span>
                    </h3>

                    <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                        @foreach ($catalog as $item)
                            @php $times = $found[$item['id']] ?? 0; @endphp

                            <li class="flex items-center gap-3 min-w-0 {{ $times ? '' : 'opacity-40 grayscale' }}">
                                <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-9 w-9 shrink-0 object-contain">
                                <span class="min-w-0">
                                    <span class="block truncate text-sm {{ $times ? 'text-gray-900' : 'text-gray-600' }}" title="{{ $item['name'] }}">{{ $item['name'] }}</span>
                                    <span class="block text-xs {{ $times ? 'text-indigo-600' : 'text-gray-500' }}">
                                        {{ $times ? trans_choice('{1} found once|[2,*] found :count times', $times) : __('not found yet') }}
                                    </span>
                                </span>
                            </li>
                        @endforeach
                    </ul>
                </div>

                <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-500 border-b border-gray-200">
                                <th class="py-3 ps-4 sm:ps-6 pe-2 font-normal">{{ __('Played') }}</th>
                                <th class="py-3 px-2 text-right font-normal">{{ __('Score') }}</th>
                                <th class="py-3 px-2 text-right font-normal">{{ __('Level') }}</th>
                                <th class="py-3 px-2 text-right font-normal hidden sm:table-cell">{{ __('Time') }}</th>
                                <th class="py-3 ps-2 pe-4 sm:pe-6 font-normal">{{ __('Rare items') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($games as $game)
                                <tr class="border-b border-gray-200 last:border-0 align-top">
                                    <td class="py-2.5 ps-4 sm:ps-6 pe-2 whitespace-nowrap">
                                        <span class="text-gray-800">{{ $game->started_at->format('M j, Y') }}</span>
                                        <span class="text-gray-500 hidden sm:inline">{{ $game->started_at->format('H:i') }}</span>
                                        @if (! $game->isLegal())
                                            <span class="block text-xs text-gray-500">
                                                {{ $game->status === \App\Models\Game::ABANDONED ? __('Not finished') : __('Offline') }}
                                            </span>
                                        @endif
                                    </td>
                                    <td class="py-2.5 px-2 text-right tabular-nums {{ $game->isLegal() ? 'text-indigo-600' : 'text-gray-500' }}">{{ number_format($game->score) }}</td>
                                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $game->level }}</td>
                                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800 hidden sm:table-cell">{{ $duration($game->game_time) }}</td>
                                    <td class="py-2 ps-2 pe-4 sm:pe-6">
                                        <div class="flex flex-wrap gap-1">
                                            @forelse ($game->pickups as $pickup)
                                                @if ($item = $catalog[$pickup->item_id] ?? null)
                                                    <img src="{{ $item['image'] }}" alt="{{ $item['name'] }}" title="{{ $item['name'] }}" loading="lazy" class="h-7 w-7 object-contain">
                                                @endif
                                            @empty
                                                <span class="py-0.5 text-gray-500">–</span>
                                            @endforelse
                                        </div>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                {{ $games->links() }}

                <p class="px-4 sm:px-0 text-sm text-gray-500">
                    {{ __('A game counts when it is played to the end while connected. Games that were left early or went offline are listed, but stay off the leaderboard and do not add to the collection.') }}
                </p>
            @endif
        </div>
    </div>
</x-app-layout>
