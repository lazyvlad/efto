<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Performance')])
    </x-slot>

    @php
        $device = $first->device ?? [];
        // Columns of a sample, in this order, with what they mean
        $columns = [
            'fps' => 'FPS', 'median' => 'Median ms', 'p95' => 'p95 ms', 'p99' => 'p99 ms', 'worst' => 'Worst ms', 'over33' => '> 33 ms', 'over50' => '> 50 ms',
            'update' => 'Logic ms', 'render' => 'Drawing ms', 'hunter' => 'Hunter ms',
            'mousePerSecond' => 'Mouse /s', 'mouseMostInFrame' => 'Mouse max/frame', 'mouseMs' => 'Mouse ms', 'slowWithMouse' => 'Slow · mouse', 'slowWithoutMouse' => 'Slow · none',
            'mode' => 'Mode', 'level' => 'Level', 'boss' => 'Boss', 'upheaval' => 'Upheaval', 'thunderfury' => 'Thunderfury',
            'falling' => 'Falling', 'projectiles' => 'Projectiles', 'arrows' => 'Arrows', 'particles' => 'Particles', 'texts' => 'Texts', 'canvas' => 'Canvas',
        ];
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm space-y-1">
                <p><a href="{{ route('admin.perf.index') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('All recordings') }}</a></p>
                <h3 class="text-lg text-gray-900">{{ $first->user?->name ?? __('Unknown player') }} · {{ $first->game_version ?? '–' }} · {{ $first->created_at?->format('M j, Y H:i') }}</h3>
                <dl class="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-gray-600">
                    @foreach ($device as $key => $value)
                        <div class="flex gap-2 min-w-0"><dt class="text-gray-500 shrink-0">{{ $key }}</dt><dd class="text-gray-900 truncate" title="{{ $value }}">{{ $value ?? '–' }}</dd></div>
                    @endforeach
                </dl>
            </div>

            <div class="bg-white shadow sm:rounded-lg overflow-x-auto">
                <table class="w-full text-xs">
                    <thead>
                        <tr class="text-left text-gray-500 border-b border-gray-200">
                            <th class="py-2 ps-4 pe-2 font-normal">{{ __('At') }}</th>
                            @foreach ($columns as $label)
                                <th class="py-2 px-2 font-normal whitespace-nowrap text-right">{{ $label }}</th>
                            @endforeach
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($samples as $sample)
                            @php $values = $sample->sample; $fps = (float) ($values['fps'] ?? 0); @endphp
                            <tr class="border-b border-gray-200 last:border-0">
                                <td class="py-1.5 ps-4 pe-2 whitespace-nowrap text-gray-600">{{ $sample->created_at?->format('H:i:s') }}</td>
                                @foreach ($columns as $key => $label)
                                    @php $value = $values[$key] ?? null; @endphp
                                    <td class="py-1.5 px-2 text-right tabular-nums whitespace-nowrap {{ $key === 'fps' ? ($fps < 30 ? 'text-red-400' : ($fps < 55 ? 'text-amber-500' : 'text-green-600')) : 'text-gray-800' }}">
                                        {{ is_bool($value) ? ($value ? 'yes' : '–') : ($value ?? '–') }}
                                    </td>
                                @endforeach
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</x-app-layout>
