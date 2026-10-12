<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Items') }}
        </h2>
    </x-slot>

    @php
        $rarityName = [
            'zee_zgnan' => __('Zee Zgnan'), 'legendary' => __('Legendary'), 'set_piece' => __('Set piece'),
            'special' => __('Special'), 'epic' => __('Epic'), 'green' => __('Uncommon'), 'regular' => __('Common'),
        ];
        $rarityColor = [
            'zee_zgnan' => 'text-orange-400', 'legendary' => 'text-orange-400', 'set_piece' => 'text-purple-400',
            'special' => 'text-blue-400', 'epic' => 'text-purple-400', 'green' => 'text-green-400', 'regular' => 'text-gray-900',
        ];
        $lootColor = ['uncommon' => 'text-green-400', 'rare' => 'text-blue-400', 'epic' => 'text-purple-400'];
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm text-gray-600 space-y-2">
                <p>
                    {{ __('Everything you can catch in the game, :total items in all, and what each pays in coins. 100 copper (c) is a silver (s), 100 silver a gold (g).', ['total' => $total]) }}
                </p>
                <p>
                    {{ __('Coins are kept on your account. They pay for starting a game in a later zone, :cost for each zone skipped, and for Boss Rush, a game of nothing but the bosses: :fee a run.', ['cost' => $skipCost, 'fee' => $rushFee]) }}
                    @guest
                        <a href="{{ route('login') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Log in to keep yours.') }}</a>
                    @endguest
                </p>
            </div>

            @foreach ($groups as $group)
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <h3 class="text-lg flex flex-wrap items-baseline gap-x-3">
                        <span class="{{ $rarityColor[$group['type']] }}">{{ $rarityName[$group['type']] }}</span>
                        <span class="text-sm text-amber-600 tabular-nums">{{ __(':coins each', ['coins' => $group['coins']]) }}</span>
                        <span class="text-sm text-gray-500">{{ trans_choice('{1} :count item|[2,*] :count items', count($group['items'])) }}</span>
                    </h3>

                    <ul class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                        @foreach ($group['items'] as $item)
                            <li class="flex items-center gap-3 min-w-0">
                                <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-10 w-10 shrink-0 object-contain">
                                <span class="min-w-0">
                                    <span class="block truncate text-sm {{ $rarityColor[$group['type']] }}" title="{{ $item['name'] }}">{{ $item['name'] }}</span>
                                    <span class="block text-xs text-amber-600 tabular-nums">{{ $group['coins'] }}</span>
                                </span>
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endforeach

            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                <h3 class="text-lg text-gray-800">{{ __('Bosses') }}</h3>
                <p class="mt-1 text-sm text-gray-500">
                    {{ __('Every zone ends with a boss. Defeating it pays coins, more in the later zones, and it drops one of its three items: the first :uncommon% of the time, the second :rare%, the third :epic%. Boss loot is kept on your account.', [
                        'uncommon' => round($chances['uncommon'] * 100),
                        'rare' => round($chances['rare'] * 100),
                        'epic' => round($chances['epic'] * 100),
                    ]) }}
                </p>

                <p class="mt-3 text-sm text-gray-500">
                    <span class="text-orange-400">{{ $quiverName }}</span>
                    {{ __('Any boss may also drop this large quiver for a logged-in player, :chance% of the time. It is found once, kept on the account, and doubles the arrows the hunter can carry: 8 slots of 50 instead of 4.', ['chance' => $quiverChance]) }}
                </p>

                @foreach ($bosses as $side => $sideBosses)
                    <h4 class="mt-5 text-sm uppercase tracking-wide text-gray-500">{{ $side === 'alliance' ? __('Alliance') : __('Horde') }}</h4>

                    <ul class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        @foreach ($sideBosses as $boss)
                            <li class="flex items-start gap-3 min-w-0">
                                <img src="{{ $boss['image'] }}" alt="" loading="lazy" class="h-12 w-12 shrink-0 object-contain">
                                <div class="min-w-0">
                                    <div class="text-sm text-gray-900">
                                        {{ $boss['name'] }}
                                        <span class="text-xs text-gray-500">{{ __('zone :zone', ['zone' => $boss['zone']]) }}</span>
                                        <span class="text-xs text-amber-600 tabular-nums">{{ $boss['coins'] }}</span>
                                    </div>
                                    <ul class="text-sm">
                                        @foreach ($boss['loot'] as $item)
                                            <li class="truncate {{ $lootColor[$item['rarity']] }}" title="{{ $item['name'] }}">{{ $item['name'] }}</li>
                                        @endforeach
                                    </ul>
                                </div>
                            </li>
                        @endforeach
                    </ul>
                @endforeach
            </div>
        </div>
    </div>
</x-app-layout>
