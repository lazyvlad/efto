{{-- How each boss fight of a game went: one row a boss, in the order they went down.
     Needs $kills (the game's boss drops); uses the boss catalog and the loot's rarity. --}}
@php
    $bossesById = collect(\App\Support\BossLoot::catalog())->flatten(1)->keyBy('id');
    $lootById = $bossesById->flatMap(fn (array $boss) => collect($boss['loot'])->keyBy('id'));
    $rarityColor = ['uncommon' => 'text-green-400', 'rare' => 'text-blue-400', 'epic' => 'text-purple-400'];
    $fightTime = fn (?float $seconds) => $seconds === null ? '–'
        : ($seconds < 60 ? number_format($seconds, 1).'s' : sprintf('%d:%04.1f', intdiv((int) $seconds, 60), fmod($seconds, 60)));
    $quiverName = config('boss_loot.quiver.name');
@endphp
<div class="overflow-x-auto -mx-4 sm:mx-0">
    <table class="w-full min-w-[36rem] text-sm game-fights">
        <thead>
            <tr class="text-left text-xs text-gray-500">
                <th class="py-1.5 ps-4 sm:ps-3 pe-2 font-normal">{{ __('Boss') }}</th>
                <th class="py-1.5 px-2 text-right font-normal">{{ __('Time') }}</th>
                <th class="py-1.5 px-2 text-right font-normal">{{ __('Points') }}</th>
                <th class="py-1.5 px-2 text-right font-normal">{{ __('Arrows') }}</th>
                <th class="py-1.5 px-2 text-right font-normal">{{ __('Damage taken') }}</th>
                <th class="py-1.5 ps-2 pe-4 sm:pe-3 font-normal">{{ __('Dropped') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($kills as $kill)
                @php
                    $boss = $bossesById[$kill->boss_id] ?? null;
                    $loot = $lootById[$kill->item_id] ?? null;
                @endphp
                <tr>
                    <td class="py-1.5 ps-4 sm:ps-3 pe-2">
                        <span class="flex items-center gap-2 min-w-0">
                            @if ($boss)<img src="{{ $boss['image'] }}" alt="" loading="lazy" class="h-6 w-6 shrink-0 object-contain">@endif
                            <span class="truncate text-gray-900">{{ $boss['name'] ?? $kill->boss_id }}</span>
                        </span>
                    </td>
                    <td class="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                        @if ($kill->fight_seconds !== null)
                            <span class="{{ $kill->par_seconds && $kill->fight_seconds <= $kill->par_seconds ? 'text-green-600' : 'text-gray-800' }}">{{ $fightTime($kill->fight_seconds) }}</span>
                            <span class="text-xs text-gray-500">/ {{ $kill->par_seconds }}s</span>
                        @else
                            <span class="text-gray-500">–</span>
                        @endif
                    </td>
                    <td class="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                        @if ($kill->points !== null)
                            <span class="text-indigo-600">{{ number_format($kill->points + $kill->speed_points) }}</span>
                            @if ($kill->speed_points)<span class="block text-xs text-green-600">{{ __('+:points speed', ['points' => number_format($kill->speed_points)]) }}</span>@endif
                        @else
                            <span class="text-gray-500">–</span>
                        @endif
                    </td>
                    <td class="py-1.5 px-2 text-right tabular-nums text-gray-800">{{ $kill->arrows_used !== null ? number_format($kill->arrows_used) : '–' }}</td>
                    <td class="py-1.5 px-2 text-right tabular-nums text-gray-800 whitespace-nowrap">
                        @if ($kill->damage_taken !== null)
                            {{ number_format($kill->damage_taken) }}
                            <span class="text-xs text-gray-500">{{ trans_choice('{0}|{1}in :count hit|[2,*]in :count hits', $kill->hits_taken) }}</span>
                        @else
                            <span class="text-gray-500">–</span>
                        @endif
                    </td>
                    <td class="py-1.5 ps-2 pe-4 sm:pe-3 truncate max-w-[12rem] {{ $loot ? $rarityColor[$loot['rarity']] ?? 'text-gray-800' : 'text-gray-500' }}" title="{{ $loot['name'] ?? '' }}">
                        {{ $loot['name'] ?? '–' }}@if ($kill->quiver)<span class="block text-xs text-orange-400">{{ __('+ :quiver', ['quiver' => $quiverName]) }}</span>@endif
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
@if ($kills->contains(fn ($kill) => $kill->fight_seconds === null))
    <p class="text-xs text-gray-500">{{ __('Fights from before 3.0.6 were not timed.') }}</p>
@endif
