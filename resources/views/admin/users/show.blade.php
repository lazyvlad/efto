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
