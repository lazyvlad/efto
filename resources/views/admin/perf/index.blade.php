<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Performance')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm text-gray-600 space-y-2">
                <h3 class="text-lg text-gray-900">{{ __('Debug mode recordings') }}</h3>
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
                                        <td class="py-2.5 px-2 text-gray-900">{{ $session['user'] ?? '–' }}</td>
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
