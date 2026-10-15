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
        $rarityClass = [
            'zee_zgnan' => 'rarity-legendary', 'legendary' => 'rarity-legendary', 'special' => 'rarity-rare',
            'epic' => 'rarity-epic', 'green' => 'rarity-uncommon', 'regular' => 'text-gray-900',
        ];
    @endphp

    <div class="py-8 sm:py-10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

            {{-- What becomes of what is caught --}}
            <section class="game-card p-4 sm:p-6">
                <p class="game-label">{{ __('Everything you can catch, :total items in all', ['total' => $total]) }}</p>
                <h3 class="game-heading text-2xl mt-1">{{ __('What becomes of what you catch') }}</h3>

                <div class="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
                    <div class="game-item !items-start" data-rarity="epic">
                        <div>
                            <div class="rarity-epic font-display text-base">{{ __('Gear is kept') }}</div>
                            <p class="mt-1 text-gray-600">{{ __('Set pieces, boss loot, and the weapons and jewellery that fall. Wear them on the character sheet; sell spare copies in the inventory.') }}</p>
                        </div>
                    </div>
                    <div class="game-item !items-start" data-rarity="rare">
                        <div>
                            <div class="rarity-rare font-display text-base">{{ __('Materials are kept') }}</div>
                            <p class="mt-1 text-gray-600">{{ __('Cloth, leather, herbs, bars, gems and the like go to your bank, for crafting things that help in a game.') }}</p>
                        </div>
                    </div>
                    <div class="game-item !items-start">
                        <div>
                            <div class="text-amber-500 font-display text-base">{{ __('The rest is sold') }}</div>
                            <p class="mt-1 text-gray-600">{{ __('As a game ends, for coins: 100 copper (c) is a silver (s), 100 silver a gold (g).') }}</p>
                        </div>
                    </div>
                </div>

                <p class="mt-4 text-sm text-gray-600">
                    {{ __('Everything caught goes into your bags first: a backpack of :backpack slots, more with bags bought, :stack of one kind to a slot. Once they are full, what does not fit sells for :share%. Your hunter takes :carry pieces of gear into a game; the rest waits in the bank.', ['backpack' => $backpack, 'stack' => $stack, 'share' => $fullShare, 'carry' => $carry]) }}
                </p>
                <p class="mt-2 text-sm text-gray-600">
                    {{ __('Coins pay for bags, for starting a game in a later zone (:cost for each zone skipped) and for Boss Rush (:fee a run).', ['cost' => $skipCost, 'fee' => $rushFee]) }}
                    @guest
                        <a href="{{ route('login') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Log in to keep yours.') }}</a>
                    @endguest
                </p>

                <nav class="game-tabs mt-5" aria-label="{{ __('On this page') }}">
                    <a href="#sets">{{ __('Hunter sets') }}</a>
                    <a href="#bosses">{{ __('Boss loot') }}</a>
                    <a href="#falling">{{ __('Weapons & jewellery') }}</a>
                    <a href="#materials">{{ __('Materials') }}</a>
                    <a href="#sold">{{ __('Sold for coins') }}</a>
                </nav>
            </section>

            {{-- The hunter sets --}}
            <section id="sets" class="scroll-mt-20 space-y-3">
                <div>
                    <p class="game-label">{{ __('Kept, and worn on the character sheet') }}</p>
                    <h3 class="game-heading text-2xl">{{ __('The hunter sets') }}</h3>
                </div>

                <div class="grid gap-4 lg:grid-cols-3">
                    @foreach ($sets as $set)
                        <div class="game-card p-4">
                            <p class="game-label">{{ __('Tier :tier · rarely falls from level :level', ['tier' => $set['tier'], 'level' => $set['fromLevel']]) }}</p>
                            @if ($set['bossZones'])
                                <p class="game-label">{{ __('Dropped by the bosses of zones :zones', ['zones' => $set['bossZones']]) }}</p>
                            @endif
                            <h4 class="font-display text-lg rarity-epic mt-0.5">{{ $set['name'] }}</h4>
                            <p class="mt-2 text-sm text-gray-900">{{ __('Each piece: :stats', ['stats' => $set['perPiece']]) }}</p>
                            <ul class="mt-2 space-y-1 text-sm">
                                @foreach ($set['bonuses'] as $pieces => $bonus)
                                    <li><span class="text-amber-500 tabular-nums">{{ __(':count pieces', ['count' => $pieces]) }}</span> <span class="text-gray-900">{{ $bonus }}</span></li>
                                @endforeach
                            </ul>
                            <ul class="mt-3 grid grid-cols-3 gap-2">
                                @foreach ($set['pieces'] as $piece)
                                    <li class="game-item !p-1.5 flex-col !gap-1 text-center" data-rarity="epic" title="{{ $piece['name'] }}">
                                        <img src="{{ $piece['image'] }}" alt="" loading="lazy" class="h-10 w-10 object-contain">
                                        <span class="text-[11px] leading-tight rarity-epic">{{ $piece['name'] }}</span>
                                    </li>
                                @endforeach
                            </ul>
                        </div>
                    @endforeach
                </div>
            </section>

            {{-- The bosses and their loot --}}
            <section id="bosses" class="scroll-mt-20 space-y-3">
                <div>
                    <p class="game-label">{{ __('Kept on your account, and worn') }}</p>
                    <h3 class="game-heading text-2xl">{{ __('Boss loot') }}</h3>
                    <p class="mt-1 text-sm text-gray-600">
                        {{ __('Every zone ends with a boss. Defeating it pays coins, more in the later zones, and it drops one of its three items: the first :uncommon% of the time, the second :rare%, the third :epic%. What an item gives comes from its item level: the green of a zone is of its level, the blue a step up and the purple two, so the green of a later zone matches the purple of an earlier one. Trinkets also help with carrying: each point takes 1% off what full bags lose.', [
                            'uncommon' => round($chances['uncommon'] * 100),
                            'rare' => round($chances['rare'] * 100),
                            'epic' => round($chances['epic'] * 100),
                        ]) }}
                    </p>
                    <p class="mt-1 text-sm text-gray-600">
                        <span class="rarity-legendary">{{ $quiverName }}</span>
                        {{ __('Any boss may also drop this large quiver for a logged-in player, :chance% of the time. Each hunter finds his own, from the bosses of his side: worn in his quiver slot, it doubles the arrows he can carry.', ['chance' => $quiverChance]) }}
                    </p>
                    <p class="mt-1 text-sm text-gray-600">
                        {{ __('From the fourth zone on, a boss may also drop a piece of a hunter set, :setChance% of the time, one its hunter does not have yet: Giantstalker in zones 4 and 5, Dragonstalker in 6 and 7, Cryptstalker from 8. And now and then, :bagChance% of the time, a bag for a logged-in player, bigger in the later zones. It goes on at once, into a free bag slot or in place of a smaller bag.', [
                            'setChance' => round(config('boss_loot.set_pieces.chance') * 100),
                            'bagChance' => round(config('boss_loot.bags.chance') * 100),
                        ]) }}
                    </p>
                </div>

                @foreach ($bosses as $side => $sideBosses)
                    <h4 class="game-label !text-sm pt-2">{{ $side === 'alliance' ? __('Alliance') : __('Horde') }}</h4>
                    <div class="grid gap-3 md:grid-cols-2">
                        @foreach ($sideBosses as $boss)
                            <div class="game-card p-3 flex gap-3">
                                <img src="{{ $boss['image'] }}" alt="" loading="lazy" class="h-16 w-16 shrink-0 object-contain">
                                <div class="min-w-0 flex-1">
                                    <div class="flex flex-wrap items-baseline gap-x-2">
                                        <span class="font-display text-base text-gray-900">{{ $boss['name'] }}</span>
                                        <span class="game-label">{{ __('zone :zone', ['zone' => $boss['zone']]) }}</span>
                                        <span class="text-xs text-amber-500 tabular-nums">{{ $boss['coins'] }}</span>
                                    </div>
                                    <ul class="mt-1.5 space-y-1">
                                        @foreach ($boss['loot'] as $item)
                                            <li class="text-sm leading-snug">
                                                <span class="rarity-{{ $item['rarity'] }}">{{ $item['name'] }}</span>
                                                <span class="text-xs text-gray-500">· {{ __('item level :level', ['level' => $item['itemLevel']]) }} · {{ $item['worn'] }}@if ($item['twoHanded']), {{ __('two-handed') }}@endif</span>
                                                <span class="block text-xs text-gray-900">{{ $item['stats'] }} <span class="text-amber-500">· {{ __('sells for :value', ['value' => $item['value']]) }}</span></span>
                                            </li>
                                        @endforeach
                                    </ul>
                                </div>
                            </div>
                        @endforeach
                    </div>
                @endforeach
            </section>

            {{-- The weapons and jewellery that fall --}}
            <section id="falling" class="scroll-mt-20 space-y-3">
                <div>
                    <p class="game-label">{{ __('Kept on your account, and worn') }}</p>
                    <h3 class="game-heading text-2xl">{{ __('Weapons and jewellery that fall') }}</h3>
                </div>
                <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    @foreach ($falling as $item)
                        <li class="game-item min-w-0" data-rarity="{{ $item['rarity'] }}">
                            <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-11 w-11 shrink-0 object-contain">
                            <span class="min-w-0">
                                <span class="block truncate rarity-{{ $item['rarity'] }}" title="{{ $item['name'] }}">{{ $item['name'] }}</span>
                                <span class="block text-xs text-gray-500">{{ __('item level :level', ['level' => $item['itemLevel']]) }} · {{ $item['worn'] }}@if ($item['twoHanded']), {{ __('two-handed') }}@endif</span>
                                <span class="block text-xs text-gray-900">{{ $item['stats'] }}</span>
                            </span>
                        </li>
                    @endforeach
                </ul>
            </section>

            {{-- The crafting materials --}}
            <section id="materials" class="scroll-mt-20 space-y-3">
                <div>
                    <p class="game-label">{{ __('Kept in your bank, for crafting') }}</p>
                    <h3 class="game-heading text-2xl">{{ __('Materials') }}</h3>
                </div>
                <ul class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                    @foreach ($materials as $item)
                        <li class="game-item min-w-0" data-rarity="rare">
                            <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-10 w-10 shrink-0 object-contain">
                            <span class="min-w-0 truncate text-sm text-gray-900" title="{{ $item['name'] }}">{{ $item['name'] }}</span>
                        </li>
                    @endforeach
                </ul>
            </section>

            {{-- What is sold for coins --}}
            <section id="sold" class="scroll-mt-20 space-y-3">
                <div>
                    <p class="game-label">{{ __('Sold as a game ends') }}</p>
                    <h3 class="game-heading text-2xl">{{ __('Sold for coins') }}</h3>
                </div>
                @foreach ($sold as $group)
                    <div class="game-card p-4">
                        <h4 class="flex flex-wrap items-baseline gap-x-3">
                            <span class="font-display text-lg {{ $rarityClass[$group['type']] ?? 'text-gray-900' }}">{{ $rarityName[$group['type']] ?? $group['type'] }}</span>
                            <span class="text-sm text-amber-500 tabular-nums">{{ __(':coins each', ['coins' => $group['coins']]) }}</span>
                            <span class="game-label">{{ trans_choice('{1} :count item|[2,*] :count items', count($group['items'])) }}</span>
                        </h4>
                        <ul class="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            @foreach ($group['items'] as $item)
                                <li class="flex items-center gap-3 min-w-0">
                                    <img src="{{ $item['image'] }}" alt="" loading="lazy" class="h-9 w-9 shrink-0 object-contain">
                                    <span class="truncate text-sm {{ $rarityClass[$group['type']] ?? 'text-gray-900' }}" title="{{ $item['name'] }}">{{ $item['name'] }}</span>
                                </li>
                            @endforeach
                        </ul>
                    </div>
                @endforeach
            </section>
        </div>
    </div>
</x-app-layout>
