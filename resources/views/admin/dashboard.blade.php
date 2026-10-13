<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Admin')])
    </x-slot>

    @php
        $figures = [
            __('Accounts') => [
                [__('All'), number_format($accounts['all'])],
                [__('New in 7 days'), number_format($accounts['week'])],
                [__('Activated'), number_format($accounts['activated'])],
                [__('With Discord'), number_format($accounts['discord'])],
                [__('Blocked'), number_format($accounts['blocked'])],
            ],
            __('Games') => [
                [__('Today'), number_format($games['today'])],
                [__('In 7 days'), number_format($games['week'])],
                [__('All'), number_format($games['all'])],
                [__('By guests'), number_format($games['guests'])],
                [__('Being played now'), number_format($games['open'])],
            ],
            __('The game') => [
                [__('Scores on record'), number_format($scores)],
                [__('Bosses brought down'), number_format($bossesDown)],
                [__('Coins in all purses'), \App\Support\Coins::format($coins)],
            ],
        ];
    @endphp

    <div class="py-8 sm:py-12">
        <div class="max-w-6xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <div class="grid gap-6 md:grid-cols-3">
                @foreach ($figures as $heading => $rows)
                    <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6">
                        <h3 class="text-lg text-gray-900 mb-3">{{ $heading }}</h3>
                        <dl class="text-sm space-y-1.5">
                            @foreach ($rows as [$label, $value])
                                <div class="flex justify-between gap-4">
                                    <dt class="text-gray-600">{{ $label }}</dt>
                                    <dd class="tabular-nums text-gray-900">{{ $value }}</dd>
                                </div>
                            @endforeach
                        </dl>
                    </div>
                @endforeach
            </div>

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <div class="flex items-baseline justify-between px-4 sm:px-6 pt-4 sm:pt-6">
                    <h3 class="text-lg text-gray-900">{{ __('Latest games') }}</h3>
                    <a href="{{ route('admin.games.index') }}" class="text-sm underline text-indigo-600 hover:text-indigo-700">{{ __('All games') }}</a>
                </div>
                @if ($recent->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('No games yet.') }}</p>
                @else
                    @include('admin.games.rows', ['games' => $recent])
                @endif
            </div>

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <div class="flex items-baseline justify-between px-4 sm:px-6 pt-4 sm:pt-6">
                    <h3 class="text-lg text-gray-900">{{ __('Newest accounts') }}</h3>
                    <a href="{{ route('admin.users.index') }}" class="text-sm underline text-indigo-600 hover:text-indigo-700">{{ __('All accounts') }}</a>
                </div>
                <ul class="px-4 sm:px-6 py-3 text-sm divide-y divide-gray-200">
                    @foreach ($newest as $user)
                        <li class="py-2 flex flex-wrap justify-between gap-x-6">
                            <a href="{{ route('admin.users.show', $user) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ $user->name }}</a>
                            <span class="text-gray-500">{{ $user->email }} · {{ $user->created_at?->diffForHumans() }}</span>
                        </li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>
</x-app-layout>
