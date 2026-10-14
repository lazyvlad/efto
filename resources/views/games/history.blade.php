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
        // A fight's length: seconds and tenths under a minute, minutes and seconds above
        $fightTime = fn (?float $seconds) => $seconds === null ? '–'
            : ($seconds < 60 ? number_format($seconds, 1).'s' : sprintf('%d:%04.1f', intdiv((int) $seconds, 60), fmod($seconds, 60)));
        $rarityColor = ['uncommon' => 'text-green-400', 'rare' => 'text-blue-400', 'epic' => 'text-purple-400'];
        $bossLootTotal = array_sum(array_map(fn (array $boss) => count($boss['loot']), $bosses));
        $bossById = collect($bosses)->keyBy('id');
        $sideName = $side === 'horde' ? __('Horde') : __('Alliance');
        $lootById = collect($bosses)->flatMap(fn (array $boss) => collect($boss['loot'])->keyBy('id'));
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @unless (auth()->user()->canUseRewards())
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm text-gray-600">
                    <span class="text-amber-600">{{ __('Your account is not activated yet.') }}</span>
                    {{ __('Everything you earn is kept, but you cannot spend coins, wear your sets or carry the large quiver until you activate it, by the link we emailed you or with Discord.') }}
                    <a href="{{ route('verification.notice') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Activate') }}</a>
                </div>
            @endunless

            @if (! $hasGames)
                <div class="bg-white shadow sm:rounded-lg">
                    <p class="p-8 text-center text-gray-600">
                        {{ __('No games yet.') }}
                        <a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Play your first.') }}</a>
                    </p>
                </div>
            @else
                {{-- Whose: the two hunters are two characters, each with his own games and loot --}}
                <nav class="hunter-switch px-4 sm:px-0" aria-label="{{ __('Hunter') }}">
                    @foreach (['alliance' => __('Alliance hunter'), 'horde' => __('Horde hunter')] as $faction => $label)
                        <a href="{{ route('games.history', ['hunter' => $faction]) }}"
                           class="hunter-switch-tab {{ $side === $faction ? 'is-on' : '' }}"
                           @if ($side === $faction) aria-current="page" @endif>
                            <span class="side-dot" data-side="{{ $faction }}"></span>{{ $label }}
                        </a>
                    @endforeach
                </nav>

                <div class="bg-white shadow sm:rounded-lg grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200 text-center">
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
                    <div class="p-4" title="{{ __('One purse for both hunters') }}">
                        <div class="text-2xl tabular-nums text-amber-600">{{ $coins }}</div>
                        <div class="text-sm text-gray-500">{{ __('Purse (both hunters)') }}</div>
                    </div>
                </div>

                {{-- His record against each boss of his side --}}
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">
                        {{ __('Boss records') }}
                        <span class="text-sm text-gray-500 ms-2">{{ __(':beaten of :total brought down', ['beaten' => collect($records)->filter(fn ($record) => $record['kills'] > 0)->count(), 'total' => count($records)]) }}</span>
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">{{ __('His best fight with each boss of the :side side. Points include the bonus for coming in under par.', ['side' => $sideName]) }}</p>

                    <div class="mt-4 overflow-x-auto -mx-4 sm:mx-0">
                        <table class="w-full text-sm min-w-[36rem]">
                            <thead>
                                <tr class="text-left text-gray-500 border-b border-gray-200">
                                    <th class="py-2 ps-4 sm:ps-0 pe-2 font-normal">{{ __('Boss') }}</th>
                                    <th class="py-2 px-2 text-right font-normal">{{ __('Kills') }}</th>
                                    <th class="py-2 px-2 text-right font-normal">{{ __('Fastest') }}</th>
                                    <th class="py-2 px-2 text-right font-normal">{{ __('Most points') }}</th>
                                    <th class="py-2 px-2 text-right font-normal">{{ __('Fewest arrows') }}</th>
                                    <th class="py-2 ps-2 pe-4 sm:pe-0 text-right font-normal">{{ __('Least damage') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($bosses as $zone => $boss)
                                    @php $record = $records[$boss['id']] ?? ['kills' => 0]; @endphp
                                    <tr class="border-b border-gray-200 last:border-0 {{ $record['kills'] ? '' : 'opacity-50' }}">
                                        <td class="py-2 ps-4 sm:ps-0 pe-2">
                                            <div class="flex items-center gap-2.5 min-w-0">
                                                <img src="{{ $boss['image'] }}" alt="" loading="lazy" class="h-8 w-8 shrink-0 object-contain {{ $record['kills'] ? '' : 'grayscale' }}">
                                                <span class="min-w-0">
                                                    <span class="block truncate text-gray-900">{{ $boss['name'] }}</span>
                                                    <span class="block text-xs text-gray-500">{{ __('Zone :zone', ['zone' => $zone + 1]) }}</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-2 px-2 text-right tabular-nums text-gray-800">{{ $record['kills'] ?: '–' }}</td>
                                        <td class="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                                            @if ($record['fastest'] ?? null)
                                                <span class="{{ $record['par'] && $record['fastest'] <= $record['par'] ? 'text-green-600' : 'text-gray-800' }}">{{ $fightTime($record['fastest']) }}</span>
                                                @if ($record['par'])<span class="block text-xs text-gray-500">{{ __('par :par s', ['par' => $record['par']]) }}</span>@endif
                                            @else
                                                <span class="text-gray-500">–</span>
                                            @endif
                                        </td>
                                        <td class="py-2 px-2 text-right tabular-nums text-indigo-600">{{ isset($record['mostPoints']) && $record['mostPoints'] !== null ? number_format($record['mostPoints']) : '–' }}</td>
                                        <td class="py-2 px-2 text-right tabular-nums text-gray-800">{{ isset($record['fewestArrows']) && $record['fewestArrows'] !== null ? number_format($record['fewestArrows']) : '–' }}</td>
                                        <td class="py-2 ps-2 pe-4 sm:pe-0 text-right tabular-nums text-gray-800">{{ isset($record['leastDamage']) && $record['leastDamage'] !== null ? number_format($record['leastDamage']) : '–' }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>

                {{-- His games: each that brought a boss down opens to how every fight went --}}
                <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                    <h3 class="text-lg text-gray-800 px-4 sm:px-6 pt-4 sm:pt-6">{{ __('Games') }}</h3>
                    @if ($games->isEmpty())
                        <p class="px-4 sm:px-6 py-6 text-sm text-gray-600">{{ __('The :side hunter has not played yet.', ['side' => $sideName]) }}</p>
                    @else
                        <ul class="mt-2 divide-y divide-gray-200 text-sm">
                            @foreach ($games as $game)
                                @php $kills = $game->bossDrops; @endphp
                                <li>
                                    <details class="game-row group" @if ($loop->first && $kills->isNotEmpty() && $games->onFirstPage()) open @endif>
                                        <summary class="game-row-summary px-4 sm:px-6 py-3 grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_5rem_3.5rem_4rem_5.5rem] gap-x-3 gap-y-1 items-baseline {{ $kills->isEmpty() ? 'cursor-default' : 'cursor-pointer' }}">
                                            <span class="min-w-0">
                                                <span class="text-gray-800">{{ $game->started_at->format('M j, Y') }}</span>
                                                <span class="text-gray-500">{{ $game->started_at->format('H:i') }}</span>
                                                <span class="block text-xs text-gray-500">
                                                    @if ($game->isBossFight()){{ __('Boss fight') }} · @elseif ($game->isBossRush()){{ __('Boss Rush') }} · @endif
                                                    @if ($game->start_zone > 1){{ __('from zone :zone', ['zone' => $game->start_zone]) }} · @endif
                                                    {{ trans_choice('{0} no boss down|{1} :count boss down|[2,*] :count bosses down', $kills->count()) }}
                                                    @unless ($game->isLegal()) · {{ $game->status === \App\Models\Game::ABANDONED ? __('not finished') : __('offline') }}@endunless
                                                    · {{ $game->game_version ? 'v'.$game->game_version : '' }}
                                                </span>
                                            </span>
                                            <span class="text-right tabular-nums {{ $game->isLegal() ? 'text-indigo-600' : 'text-gray-500' }}">
                                                {{ number_format($game->score) }}
                                                <span class="block text-xs text-gray-500 sm:hidden">{{ __('level :level', ['level' => $game->level]) }} · {{ $duration($game->game_time) }}</span>
                                            </span>
                                            <span class="hidden sm:block text-right tabular-nums text-gray-800">{{ __('lv :level', ['level' => $game->level]) }}</span>
                                            <span class="hidden sm:block text-right tabular-nums text-gray-800">{{ $duration($game->game_time) }}</span>
                                            <span class="hidden sm:block text-right tabular-nums text-amber-700 whitespace-nowrap">{{ \App\Support\Coins::format($game->coins) }}</span>
                                        </summary>

                                        <div class="px-4 sm:px-6 pb-4 space-y-3">
                                            @if ($kills->isNotEmpty())
                                                @include('games.fights', ['kills' => $kills])
                                            @endif

                                            @if ($game->scoreEntry)
                                                <p class="text-xs">
                                                    <a href="{{ route('games.show', $game->id) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Its page on the high scores') }}</a>
                                                    <span class="text-gray-500">· {{ __('anyone can see how this game went') }}</span>
                                                </p>
                                            @endif
                                            @if ($game->pickups->isNotEmpty())
                                                <div class="flex flex-wrap items-center gap-1">
                                                    <span class="text-xs text-gray-500 me-1">{{ __('Rare items') }}</span>
                                                    @foreach ($game->pickups as $pickup)
                                                        @if ($item = $catalog[$pickup->item_id] ?? null)
                                                            <img src="{{ $item['image'] }}" alt="{{ $item['name'] }}" title="{{ $item['name'] }}" loading="lazy" class="h-7 w-7 object-contain">
                                                        @endif
                                                    @endforeach
                                                </div>
                                            @endif
                                        </div>
                                    </details>
                                </li>
                            @endforeach
                        </ul>
                        <div class="px-4 sm:px-6 py-3">{{ $games->links() }}</div>
                    @endif
                </div>

                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">
                        {{ __('Boss loot') }}
                        <span class="text-sm text-gray-500 ms-2">{{ __(':found of :total found', ['found' => $bossLoot->count(), 'total' => $bossLootTotal]) }}</span>
                    </h3>
                    <p class="mt-1 text-sm text-gray-500">{{ __('Every boss he defeats drops one of its three items. The rarer ones take more kills.') }}</p>

                    <p class="mt-3 text-sm {{ $quiver ? 'text-orange-400' : 'text-gray-400' }}">
                        {{ $quiverName }}
                        <span class="text-xs text-gray-500">
                            {{ $quiver ? __('his: worn in his quiver slot, it holds twice the arrows') : __('not found yet: any boss may drop it, and it doubles the arrows he can carry') }}
                        </span>
                    </p>

                    <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        @foreach ($bosses as $boss)
                            @php $beaten = collect($boss['loot'])->contains(fn (array $item) => isset($bossLoot[$item['id']])); @endphp

                            <li class="flex items-start gap-3 min-w-0">
                                <img src="{{ $boss['image'] }}" alt="" loading="lazy" class="h-12 w-12 shrink-0 object-contain {{ $beaten ? '' : 'opacity-40 grayscale' }}">
                                <div class="min-w-0">
                                    <div class="text-sm {{ $beaten ? 'text-gray-900' : 'text-gray-600' }}">{{ $boss['name'] }}</div>
                                    <ul class="text-sm">
                                        @foreach ($boss['loot'] as $item)
                                            @php $times = $bossLoot[$item['id']] ?? 0; @endphp

                                            <li class="truncate {{ $times ? $rarityColor[$item['rarity']] : 'text-gray-400' }}" title="{{ $item['name'] }}">
                                                {{ $item['name'] }}
                                                @if ($times > 1)
                                                    <span class="text-xs text-gray-500">&times;{{ $times }}</span>
                                                @endif
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </div>

                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">{{ __('Hunter sets') }}</h3>
                    <p class="mt-1 text-sm text-gray-500">{{ __('Every piece he catches is his for good. Wear them on the character sheet: a set gives more the more of it he wears.') }}</p>

                    @foreach ($sets as $set)
                        <h4 class="mt-5 text-sm text-purple-400">
                            {{ $set['name'] }}
                            <span class="text-xs text-gray-500 ms-2">{{ __('tier :tier', ['tier' => $set['tier']]) }} &middot; {{ __(':owned of :total', ['owned' => $set['owned'], 'total' => count($set['pieces'])]) }}</span>
                        </h4>

                        <ul class="mt-2 flex flex-wrap gap-3">
                            @foreach ($set['pieces'] as $piece)
                                <li title="{{ $piece['name'] }}" class="{{ $piece['owned'] ? '' : 'opacity-30 grayscale' }}">
                                    <img src="{{ $piece['image'] }}" alt="{{ $piece['name'] }}" loading="lazy" class="h-11 w-11 object-contain">
                                </li>
                            @endforeach
                        </ul>
                    @endforeach
                </div>

                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg text-gray-800">
                        {{ __('Rare items') }}
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

                <p class="px-4 sm:px-0 text-sm text-gray-500">
                    {{ __('A game counts when it is played to the end while connected. Games that were left early or went offline are listed, but stay off the leaderboard and do not add to the collection. Coins and boss loot are his either way. Fight times, points and arrows are as the game recorded them.') }}
                </p>
            @endif
        </div>
    </div>
</x-app-layout>
