<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Performance')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
            {{-- By device: how the game runs on the machines people play on --}}
            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <div class="p-4 sm:p-6 text-sm text-gray-600 space-y-2">
                    <div class="flex flex-wrap items-baseline justify-between gap-3">
                        <h3 class="text-lg text-gray-900">{{ __('By device, the last :days days', ['days' => config('game.perf_keep_days')]) }}</h3>
                        <div class="flex gap-3">
                            @foreach (['all' => __('All'), 'sampled' => __('Players\' games'), 'debug' => __('Debug mode')] as $value => $label)
                                <a href="{{ route('admin.perf.index', $value === 'all' ? [] : ['source' => $value]) }}" class="{{ $source === $value ? 'text-gray-900 font-semibold' : 'underline text-indigo-600 hover:text-indigo-700' }}">{{ $label }}</a>
                            @endforeach
                        </div>
                    </div>
                    <p>{{ __('One game in :n quietly sends how it runs every 30 seconds of play: its frame rate, how often a frame takes too long, and the device. Slow frames are those over 33 ms (a visible hitch).', ['n' => config('game.perf_share') > 0 ? round(1 / config('game.perf_share')) : '–']) }}</p>
                </div>
                @if (empty($devices))
                    <p class="px-4 sm:px-6 pb-6 text-sm text-gray-600">{{ __('Nothing recorded yet.') }}</p>
                @else
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-gray-500 border-y border-gray-200">
                                    <th class="py-3 ps-4 sm:ps-6 pe-2 font-normal">{{ __('Graphics card') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('System') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Games') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Minutes') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('FPS (avg · low)') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Slow frames / min') }}</th>
                                    <th class="py-3 ps-2 pe-4 sm:pe-6 text-right font-normal">{{ __('Under 50 fps') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($devices as $device)
                                    @php $struggles = ($device['lowFps'] ?? 60) < 40 || $device['under50'] >= 20; @endphp
                                    <tr class="border-b border-gray-200 last:border-0 align-top {{ $struggles ? 'bg-red-50' : '' }}">
                                        <td class="py-2.5 ps-4 sm:ps-6 pe-2 text-gray-900 max-w-[20rem]"><span class="block truncate" title="{{ $device['gpu'] }}">{{ $device['gpu'] }}</span></td>
                                        <td class="py-2.5 px-2 text-gray-600 whitespace-nowrap">{{ $device['system'] }}@if ($device['touch']) · {{ __('touch') }}@endif<span class="block text-xs text-gray-500">{{ $device['window'] }}</span></td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $device['games'] }}</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $device['minutes'] }}</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $device['fps'] ?? '–' }} · {{ $device['lowFps'] ?? '–' }}</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $device['slowPerMinute'] }}</td>
                                        <td class="py-2.5 ps-2 pe-4 sm:pe-6 text-right tabular-nums {{ $device['under50'] >= 20 ? 'text-red-700 font-semibold' : 'text-gray-800' }}">{{ $device['under50'] }}%</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>

            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm text-gray-600 space-y-2">
                <h3 class="text-lg text-gray-900">{{ __('Sessions') }}</h3>
                <p>
                    {{ __('Open the game with') }} <code class="text-gray-900">?debug=perf</code>
                    (<a href="{{ route('play', ['debug' => 'perf']) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ route('play', ['debug' => 'perf']) }}</a>)
                    {{ __('while logged in: the browser keeps it on, a badge in the corner shows the frame rate, and every five seconds of play a summary comes here. Turn it off with') }}
                    <code class="text-gray-900">?debug=off</code>.
                </p>
            </div>

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                @if ($sessions->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('Nothing recorded yet.') }}</p>
                @else
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="text-left text-gray-500 border-b border-gray-200">
                                    <th class="py-3 ps-4 sm:ps-6 pe-2 font-normal">{{ __('Recorded') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Player') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Version') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Device') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Samples') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('FPS (avg · worst)') }}</th>
                                    <th class="py-3 ps-2 pe-4 sm:pe-6 text-right font-normal">{{ __('Slowest p95') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($sessions as $session)
                                    <tr class="border-b border-gray-200 last:border-0 align-top">
                                        <td class="py-2.5 ps-4 sm:ps-6 pe-2 whitespace-nowrap">
                                            <a href="{{ route('admin.perf.show', $session['session']) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ $session['startedAt']?->format('M j, H:i') }}</a>
                                        </td>
                                        <td class="py-2.5 px-2 text-gray-900">{{ $session['user'] ?? '–' }}<span class="block text-xs text-gray-500">{{ $session['sampled'] ? __('sampled') : __('debug mode') }}</span></td>
                                        <td class="py-2.5 px-2 text-gray-600">{{ $session['version'] ?? '–' }}</td>
                                        <td class="py-2.5 px-2 text-gray-600 max-w-[22rem]">
                                            <span class="block truncate" title="{{ $session['device']['gpu'] ?? '' }}">{{ $session['device']['gpu'] ?? __('graphics card not told') }}</span>
                                            <span class="block text-xs text-gray-500">{{ $session['device']['window'] ?? '' }} · {{ __('density :dpr', ['dpr' => $session['device']['dpr'] ?? '?']) }}</span>
                                        </td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $session['samples'] }}</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $session['fps'] ?? '–' }} · {{ $session['worstFps'] ?? '–' }}</td>
                                        <td class="py-2.5 ps-2 pe-4 sm:pe-6 text-right tabular-nums text-gray-800">{{ $session['p95'] }} ms</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>
        </div>
    </div>
</x-app-layout>
