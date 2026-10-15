{{-- The games being played now, one card each. Also sent alone, for the page to refresh itself. --}}
@php
    $playingFor = function ($game) {
        $seconds = (int) $game->started_at->diffInSeconds(now(), true);
        return $seconds >= 3600
            ? sprintf('%dh %02dm', intdiv($seconds, 3600), intdiv($seconds % 3600, 60))
            : sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
    };
@endphp

@if ($games->isEmpty())
    <div class="bg-white shadow sm:rounded-lg p-8 text-center text-gray-600">
        {{ __('Nobody is playing right now.') }}
        <a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Be the one.') }}</a>
    </div>
@else
    <p class="px-4 sm:px-0 text-sm text-gray-800">
        <span class="live-dot"></span>{{ trans_choice('{1} :count game being played|[2,*] :count games being played', $games->count()) }}
    </p>
    <ul class="grid gap-4 sm:grid-cols-2">
        @foreach ($games as $game)
            @php
                $live = $game->live ?? [];
                // The level as the game shows it (it counts from 0)
                $level = ($live['level'] ?? null) !== null ? $live['level'] + 1 : null;
                $zone = $level && $levelsPerZone ? intdiv($level - 1, $levelsPerZone) % 10 + 1 : $game->start_zone;
                $fighting = isset($live['boss']) ? $bosses[$live['boss']] ?? null : null;
                $side = $game->faction;
                $mode = $game->isBossFight() ? __('Boss fight') : ($game->isBossRush() ? __('Boss Rush') : __('Game'));
            @endphp
            <li class="bg-white shadow sm:rounded-lg p-4 space-y-3">
                <div class="flex items-center gap-3 min-w-0">
                    <x-avatar :user="$game->user" :name="$game->name" :side="$side" class="h-10 w-10 text-base shrink-0" />
                    <div class="min-w-0 flex-1">
                        <div class="truncate text-gray-900">{{ $game->name }}</div>
                        <div class="text-xs text-gray-500">
                            @if ($side)<span class="side-dot" data-side="{{ $side }}"></span>{{ ucfirst($side) }} · @endif{{ $mode }}
                            @if ($game->game_version) · v{{ $game->game_version }}@endif
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg tabular-nums text-indigo-600">{{ number_format($live['score'] ?? 0) }}</div>
                        <div class="text-xs text-gray-500">{{ __('playing :time', ['time' => $playingFor($game)]) }}</div>
                    </div>
                </div>

                <div class="text-sm text-gray-600">
                    @if ($level)
                        {{ __('Level :level · zone :zone', ['level' => $level, 'zone' => $zone]) }}
                    @else
                        {{ __('Just started, in zone :zone', ['zone' => $game->start_zone]) }}
                    @endif
                </div>

                @if ($fighting)
                    <div class="text-sm">
                        <div class="flex items-center gap-2">
                            <img src="{{ $fighting['image'] }}" alt="" class="h-7 w-7 object-contain">
                            <span class="text-red-400">{{ __('Fighting :boss', ['boss' => $fighting['name']]) }}</span>
                            <span class="ms-auto tabular-nums text-gray-600">{{ (int) round(($live['bossHealth'] ?? 1) * 100) }}%</span>
                        </div>
                        <span class="block h-1.5 mt-1.5 rounded bg-gray-200 overflow-hidden"><span class="block h-full bg-red-500" style="width: {{ max(1, (int) round(($live['bossHealth'] ?? 1) * 100)) }}%"></span></span>
                    </div>
                @endif

                @if ($game->bossDrops->isNotEmpty())
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="text-xs text-gray-500 me-1">{{ __('Down:') }}</span>
                        @foreach ($game->bossDrops as $kill)
                            @if ($boss = $bosses[$kill->boss_id] ?? null)
                                <img src="{{ $boss['image'] }}" alt="{{ $boss['name'] }}" title="{{ $boss['name'] }}{{ $kill->fight_seconds ? ' · '.number_format($kill->fight_seconds, 1).'s' : '' }}" class="h-7 w-7 object-contain">
                            @endif
                        @endforeach
                    </div>
                @endif
            </li>
        @endforeach
    </ul>
@endif
