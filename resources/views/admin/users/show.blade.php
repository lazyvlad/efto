<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => $user->name])
    </x-slot>

    @php
        $me = $user->is(auth()->user());
        $facts = [
            __('Email') => $user->email.($user->hasVerifiedEmail() ? '' : ' ('.__('not confirmed').')'),
            __('Discord') => $user->discord_name ?? '–',
            __('Registered') => $user->created_at?->format('M j, Y H:i'),
            __('Games') => number_format($user->games_count),
            __('Best score') => $best ? number_format($best) : '–',
            __('Boss loot') => number_format($user->boss_drops_count),
            __('Set pieces') => $pieces,
            __('Large quiver') => $user->quiver ? __('yes') : __('no'),
            __('News emails') => $user->news_emails ? __('yes') : __('no'),
        ];
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <div class="grid gap-6 md:grid-cols-2">
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                    <div class="flex items-center gap-4 mb-4">
                        <x-avatar :user="$user" class="h-12 w-12 text-lg shrink-0" />
                        <div>
                            <h3 class="text-lg text-gray-900">{{ $user->name }}</h3>
                            <p class="text-sm">@include('admin.users.state')</p>
                        </div>
                    </div>
                    <dl class="text-sm space-y-1.5">
                        @foreach ($facts as $label => $value)
                            <div class="flex justify-between gap-4">
                                <dt class="text-gray-600">{{ $label }}</dt>
                                <dd class="text-gray-900 text-right break-all">{{ $value }}</dd>
                            </div>
                        @endforeach
                    </dl>
                </div>

                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 space-y-6 text-sm">
                    <form method="POST" action="{{ route('admin.users.coins', $user) }}">
                        @csrf
                        <h3 class="text-lg text-gray-900">{{ __('Purse') }}</h3>
                        <p class="text-gray-600 mb-3">{{ __('Now: :coins. Set it to:', ['coins' => \App\Support\Coins::format((int) $user->coins)]) }}</p>
                        <div class="flex flex-wrap items-end gap-3">
                            @foreach (['gold' => intdiv((int) $user->coins, 10000), 'silver' => intdiv((int) $user->coins, 100) % 100, 'copper' => (int) $user->coins % 100] as $coin => $amount)
                                <label class="block">
                                    <span class="text-gray-600">{{ __(ucfirst($coin)) }}</span>
                                    <x-text-input type="number" name="{{ $coin }}" :value="old($coin, $amount)" min="0" :max="$coin === 'gold' ? 100000 : 99" class="block mt-1 w-24 !py-1.5" />
                                </label>
                            @endforeach
                            <x-primary-button>{{ __('Set') }}</x-primary-button>
                        </div>
                    </form>

                    <div class="pt-6 border-t border-gray-200 flex flex-wrap gap-3">
                        @unless ($user->canUseRewards())
                            <form method="POST" action="{{ route('admin.users.activate', $user) }}">
                                @csrf
                                <x-primary-button>{{ __('Activate') }}</x-primary-button>
                            </form>
                        @endunless

                        @unless ($me)
                            <form method="POST" action="{{ route($user->isBlocked() ? 'admin.users.unblock' : 'admin.users.block', $user) }}">
                                @csrf
                                <x-secondary-button type="submit">{{ $user->isBlocked() ? __('Unblock') : __('Block') }}</x-secondary-button>
                            </form>

                            <form method="POST" action="{{ route('admin.users.admin', $user) }}"
                                  onsubmit="return confirm(@js($user->is_admin ? __('Take the admin section from this account?') : __('Let this account use the admin section?')))">
                                @csrf
                                <x-secondary-button type="submit">{{ $user->is_admin ? __('Remove admin') : __('Make admin') }}</x-secondary-button>
                            </form>
                        @endunless
                    </div>
                    <p class="text-gray-500">
                        {{ __('A blocked account cannot log in and is logged out where it is. Its player can still play as a guest.') }}
                    </p>

                    @unless ($me)
                        <form method="POST" action="{{ route('admin.users.destroy', $user) }}" class="pt-6 border-t border-gray-200">
                            @csrf
                            @method('DELETE')
                            <h3 class="text-lg text-gray-900">{{ __('Delete the account') }}</h3>
                            <p class="text-gray-600 mb-3">
                                {{ __('This cannot be undone. The coins, boss loot and sets go with it; the games and scores stay, tied to no one. Type the email address of the account to confirm.') }}
                            </p>
                            <div class="flex flex-wrap gap-3">
                                <x-text-input type="text" name="confirm" placeholder="{{ $user->email }}" autocomplete="off" class="!py-1.5 w-64" />
                                <x-danger-button>{{ __('Delete') }}</x-danger-button>
                            </div>
                        </form>
                    @endunless
                </div>
            </div>

            {{-- Opening content for the player without their having earned it (App\Support\Grants) --}}
            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm space-y-6">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h3 class="text-lg text-gray-900">{{ __('Unlock content') }}</h3>
                        <p class="text-gray-600">
                            {{ __('Open for this player what they have not earned yet. What is given here is kept apart from what they earned, and only what was given can be taken back.') }}
                        </p>
                    </div>
                    <form method="POST" action="{{ route('admin.users.unlock-all', $user) }}"
                          onsubmit="return confirm(@js(__('Open every zone of both sides, give the large quiver and all the sets?')))">
                        @csrf
                        <x-primary-button>{{ __('Unlock everything') }}</x-primary-button>
                    </form>
                </div>

                <div class="grid gap-6 md:grid-cols-2">
                    @foreach ($sides as $faction => $side)
                        <div class="pt-4 border-t border-gray-200">
                            <h4 class="text-gray-900">{{ __(':side zones', ['side' => ucfirst($faction)]) }}</h4>
                            <p class="text-gray-600 mb-3">
                                {{ __('May start as far as zone :zone.', ['zone' => $side['openTo']]) }}
                                @if ($side['granted'])
                                    {{ trans_choice('{1} :count boss was counted as beaten from here.|[2,*] :count bosses were counted as beaten from here.', $side['granted'], ['count' => $side['granted']]) }}
                                @endif
                            </p>
                            <div class="flex flex-wrap items-end gap-3">
                                <form method="POST" action="{{ route('admin.users.zones', $user) }}" class="flex flex-wrap items-end gap-3">
                                    @csrf
                                    <input type="hidden" name="faction" value="{{ $faction }}">
                                    <label class="block">
                                        <span class="text-gray-600">{{ __('Open up to') }}</span>
                                        <select name="bosses" class="block mt-1 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm !py-1.5">
                                            @for ($beaten = 1; $beaten <= $side['bosses']; $beaten++)
                                                <option value="{{ $beaten }}" @selected($beaten === $side['bosses'])>
                                                    {{ $beaten < $side['bosses'] ? __('Zone :zone', ['zone' => $beaten + 1]) : __('Zone :zone, its boss beaten too', ['zone' => $beaten]) }}
                                                </option>
                                            @endfor
                                        </select>
                                    </label>
                                    <x-primary-button>{{ __('Open') }}</x-primary-button>
                                </form>
                                @if ($side['granted'])
                                    <form method="POST" action="{{ route('admin.users.zones.lock', $user) }}">
                                        @csrf
                                        <input type="hidden" name="faction" value="{{ $faction }}">
                                        <x-secondary-button type="submit">{{ __('Take back') }}</x-secondary-button>
                                    </form>
                                @endif
                            </div>
                        </div>
                    @endforeach
                </div>

                <div class="pt-4 border-t border-gray-200">
                    <h4 class="text-gray-900 mb-3">{{ __('Hunter sets and the quiver') }}</h4>
                    <ul class="divide-y divide-gray-200">
                        @foreach ($sets as $set)
                            @php
                                $pieceIds = array_column($set['pieces'], 'id');
                                $given = count(array_intersect($pieceIds, $grantedPieces));
                            @endphp
                            <li class="py-2.5 flex flex-wrap items-center justify-between gap-3">
                                <span>
                                    <span class="text-gray-900">{{ $set['name'] }}</span>
                                    <span class="text-gray-600">· {{ __(':owned of :all pieces', ['owned' => $set['owned'], 'all' => count($set['pieces'])]) }}@if ($given), {{ __(':count given from here', ['count' => $given]) }}@endif</span>
                                </span>
                                <span class="flex gap-3">
                                    @if ($set['owned'] < count($set['pieces']))
                                        <form method="POST" action="{{ route('admin.users.set', $user) }}">
                                            @csrf
                                            <input type="hidden" name="set" value="{{ $set['id'] }}">
                                            <x-primary-button class="!py-1">{{ __('Give the whole set') }}</x-primary-button>
                                        </form>
                                    @endif
                                    @if ($given)
                                        <form method="POST" action="{{ route('admin.users.set', $user) }}">
                                            @csrf
                                            <input type="hidden" name="set" value="{{ $set['id'] }}">
                                            <input type="hidden" name="take" value="1">
                                            <x-secondary-button type="submit" class="!py-1">{{ __('Take back') }}</x-secondary-button>
                                        </form>
                                    @endif
                                </span>
                            </li>
                        @endforeach
                        <li class="py-2.5 flex flex-wrap items-center justify-between gap-3">
                            <span>
                                <span class="text-gray-900">{{ config('boss_loot.quiver.name') }}</span>
                                <span class="text-gray-600">· {{ __('the large quiver') }}, {{ $user->quiver ? __('has it') : __('does not have it') }}</span>
                            </span>
                            <form method="POST" action="{{ route('admin.users.quiver', $user) }}">
                                @csrf
                                @if ($user->quiver)
                                    <x-secondary-button type="submit" class="!py-1">{{ __('Take away') }}</x-secondary-button>
                                @else
                                    <x-primary-button class="!py-1">{{ __('Give') }}</x-primary-button>
                                @endif
                            </form>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <h3 class="text-lg text-gray-900 px-4 sm:px-6 pt-4 sm:pt-6">{{ __('Latest games') }}</h3>
                @if ($games->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('No games yet.') }}</p>
                @else
                    @include('admin.games.rows', ['games' => $games, 'hidePlayer' => true])
                @endif
            </div>
        </div>
    </div>
</x-app-layout>
