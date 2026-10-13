<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Game settings')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm text-gray-600 space-y-2">
                <p>
                    {{ __('These numbers are laid over the game\'s own. A change takes effect for games started after it is saved; a game already running keeps what it started with until the player reloads the page.') }}
                </p>
                <p>
                    {{ trans_choice('{0} Nothing is changed: everything is at the game\'s own value.|{1} :count setting differs from the game\'s own value, marked below.|[2,*] :count settings differ from the game\'s own values, marked below.', $changed, ['count' => $changed]) }}
                </p>
            </div>

            <form method="POST" action="{{ route('admin.settings.update') }}" class="space-y-6">
                @csrf

                @foreach ($groups as $group => $settings)
                    <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm">
                        <h3 class="text-lg text-gray-900">{{ __($group) }}</h3>
                        @if ($notes[$group] ?? null)
                            <p class="text-gray-600">{{ __($notes[$group]) }}</p>
                        @endif

                        <div class="mt-4 divide-y divide-gray-200">
                            @foreach ($settings as $key => $setting)
                                @php $differs = abs($setting['value'] - $setting['own']) > 1e-9; @endphp
                                <div class="py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                                    <label for="{{ $key }}" class="flex-1 min-w-[14rem]">
                                        <span class="text-gray-900">{{ __($setting['label']) }}</span>
                                        @if ($setting['help'] ?? null)
                                            <span class="block text-gray-500">{{ __($setting['help']) }}</span>
                                        @endif
                                        <x-input-error :messages="$errors->get($key)" class="mt-1" />
                                    </label>
                                    <div class="flex items-center gap-3">
                                        <span class="{{ $differs ? 'text-amber-600' : 'text-gray-500' }}">
                                            {{ $differs ? __('changed; the game\'s own is :value', ['value' => $setting['own']]) : __('the game\'s own') }}
                                        </span>
                                        <x-text-input type="number" id="{{ $key }}" name="{{ $key }}" :value="old($key, $setting['value'])"
                                                      min="{{ $setting['min'] }}" max="{{ $setting['max'] }}" step="{{ $setting['step'] }}" required
                                                      class="w-32 !py-1.5 text-right" />
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    </div>
                @endforeach

                <div class="flex flex-wrap gap-3 px-4 sm:px-0">
                    <x-primary-button>{{ __('Save') }}</x-primary-button>
                    <x-secondary-button type="submit" form="reset-settings">{{ __('Back to the game\'s own values') }}</x-secondary-button>
                </div>
            </form>

            <form id="reset-settings" method="POST" action="{{ route('admin.settings.reset') }}"
                  onsubmit="return confirm(@js(__('Put every setting back to the game\'s own value?')))">
                @csrf
            </form>
        </div>
    </div>
</x-app-layout>
