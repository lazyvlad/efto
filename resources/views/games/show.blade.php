<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __(':name\'s game', ['name' => $game->name]) }}
        </h2>
    </x-slot>

    @php
        $duration = fn (int $seconds) => $seconds >= 3600
            ? sprintf('%dh %02dm', intdiv($seconds, 3600), intdiv($seconds % 3600, 60))
            : sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
        $kills = $game->bossDrops;
        $side = $game->faction;
        $gear = $game->gear;
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 flex flex-wrap items-center gap-4">
                <x-avatar :user="$game->user" :name="$game->name" :side="$side" class="h-14 w-14 text-xl shrink-0" />
                <div class="min-w-0 flex-1">
                    <h3 class="text-xl text-gray-900 truncate">{{ $game->name }}</h3>
                    <p class="text-sm text-gray-600">
                        @if ($side)
                            <span class="side-dot" data-side="{{ $side }}"></span>{{ __(':side hunter', ['side' => ucfirst($side)]) }} ·
                        @endif
                        @if ($game->game_version){{ __('version :version', ['version' => $game->game_version]) }} · @endif
                        {{ $game->started_at->format('M j, Y H:i') }}
                        @if ($game->start_zone > 1) · {{ __('from zone :zone', ['zone' => $game->start_zone]) }}@endif
                    </p>
                </div>
                <p class="text-sm text-gray-600 text-right">
                    <span class="block text-2xl tabular-nums text-indigo-600">#{{ $rank }}</span>
                    {{ $game->game_version ? __('of version :version', ['version' => $game->game_version]) : __('of the older scores') }}
                </p>
            </div>

            <div class="bg-white shadow sm:rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200 text-center">
                <div class="p-4">
                    <div class="text-2xl tabular-nums text-indigo-600">{{ number_format($score->score) }}</div>
                    <div class="text-sm text-gray-500">{{ __('Score') }}</div>
                </div>
                <div class="p-4">
                    <div class="text-2xl tabular-nums text-gray-900">{{ $game->level }}</div>
                    <div class="text-sm text-gray-500">{{ __('Level reached') }}</div>
                </div>
                <div class="p-4">
                    <div class="text-2xl tabular-nums text-gray-900">{{ $kills->count() }}</div>
                    <div class="text-sm text-gray-500">{{ __('Bosses down') }}</div>
                </div>
                <div class="p-4">
                    <div class="text-2xl tabular-nums text-gray-900">{{ $duration($game->game_time) }}</div>
                    <div class="text-sm text-gray-500">{{ __('Time played') }}</div>
                </div>
            </div>

            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm">
                <h3 class="text-lg text-gray-800">{{ __('Gear') }}</h3>
                @if ($game->gearLabel())
                    <p class="mt-1">
                        <span class="text-purple-400">{{ $game->gearLabel() }}</span>
                        <span class="text-gray-600">· {{ __('+:health health, :armor armor, :attack attack power at its strongest', ['health' => $gear['health'] ?? 0, 'armor' => $gear['armor'] ?? 0, 'attack' => $gear['attackPower'] ?? 0]) }}</span>
                    </p>
                @elseif ($gear)
                    <p class="mt-1 text-gray-600">{{ __('No hunter set: +:health health, :armor armor, :attack attack power from the rest of his gear.', ['health' => $gear['health'] ?? 0, 'armor' => $gear['armor'] ?? 0, 'attack' => $gear['attackPower'] ?? 0]) }}</p>
                @else
                    <p class="mt-1 text-gray-600">{{ __('Played without gear.') }}</p>
                @endif
            </div>

            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 space-y-3">
                <h3 class="text-lg text-gray-800">{{ __('Boss fights') }}</h3>
                @if ($kills->isEmpty() && ! $game->last_fight)
                    <p class="text-sm text-gray-600">{{ __('No boss was fought in this game.') }}</p>
                @else
                    <p class="text-sm text-gray-500">{{ __('Each boss in the order it went down: how long the fight took against its par time, the points it paid (with the bonus for speed), the arrows spent and the damage taken. Last, the fight the game ended in, and how much the boss had left.') }}</p>
                    @include('games.fights', ['kills' => $kills, 'game' => $game])
                @endif
            </div>

            @if ($game->pickups->isNotEmpty())
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">{{ __('Rare items caught') }}</h3>
                    <ul class="mt-3 flex flex-wrap gap-3">
                        {{-- Each kind once, with how many were caught --}}
                        @foreach ($game->pickups->countBy('item_id')->sortDesc() as $itemId => $times)
                            @if ($item = $catalog[$itemId] ?? null)
                                <li class="flex items-center gap-2 text-sm text-gray-800">
                                    <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-9 w-9 object-contain">{{ $item['name'] }}
                                    @if ($times > 1)<span class="text-xs text-gray-500">&times;{{ $times }}</span>@endif
                                </li>
                            @endif
                        @endforeach
                    </ul>
                </div>
            @endif

            <p class="px-4 sm:px-0">
                <a href="{{ route('highscores') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Back to the high scores') }}</a>
            </p>
        </div>
    </div>
</x-app-layout>
