<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('High Scores') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                @if ($scores->isEmpty())
                    <p class="p-8 text-center text-gray-600">
                        {{ __('No scores yet.') }}
                        <a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Be the first.') }}</a>
                    </p>
                @else
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-500 border-b border-gray-200">
                                <th class="py-3 ps-4 sm:ps-6 pe-2 w-12 font-normal">#</th>
                                <th class="py-3 px-2 font-normal">{{ __('Player') }}</th>
                                <th class="py-3 px-2 text-right font-normal">{{ __('Score') }}</th>
                                <th class="py-3 px-2 text-right font-normal">{{ __('Level') }}</th>
                                <th class="py-3 px-2 text-right font-normal hidden sm:table-cell">{{ __('Bosses') }}</th>
                                <th class="py-3 px-2 font-normal hidden md:table-cell">{{ __('Gear') }}</th>
                                <th class="py-3 px-2 font-normal hidden md:table-cell">{{ __('Version') }}</th>
                                <th class="py-3 ps-2 pe-4 sm:pe-6 text-right font-normal hidden sm:table-cell">{{ __('Date') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($scores as $score)
                                @php $mine = auth()->check() && $score->user_id === auth()->id(); @endphp

                                <tr class="border-b border-gray-200 last:border-0 {{ $mine ? 'bg-indigo-50' : '' }}">
                                    <td class="py-2.5 ps-4 sm:ps-6 pe-2 tabular-nums {{ $loop->iteration <= 3 ? 'text-indigo-600 text-base' : 'text-gray-500' }}">
                                        {{ $loop->iteration }}
                                    </td>
                                    <td class="py-2.5 px-2">
                                        <div class="flex items-center gap-3 min-w-0">
                                            <x-avatar :user="$score->user" :name="$score->name" :side="$score->game?->faction" class="h-8 w-8 text-sm shrink-0" />
                                            <span class="truncate {{ $score->user_id ? 'text-gray-900' : 'text-gray-600' }}">{{ $score->name }}</span>
                                            @if ($mine)
                                                <span class="text-xs text-indigo-600">{{ __('you') }}</span>
                                            @endif
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-2 text-right tabular-nums text-indigo-600">{{ number_format($score->score) }}</td>
                                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $score->level }}</td>
                                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800 hidden sm:table-cell">{{ $score->game?->boss_drops_count ?: '–' }}</td>
                                    @php $gear = $score->game?->gear; @endphp
                                    <td class="py-2.5 px-2 whitespace-nowrap hidden md:table-cell {{ $gear ? 'text-purple-400' : 'text-gray-500' }}"
                                        @if ($gear) title="{{ __('+:health health, :armor armor, :attack attack power', ['health' => $gear['health'], 'armor' => $gear['armor'], 'attack' => $gear['attackPower']]) }}" @endif>
                                        {{ $score->game?->gearLabel() ?? __('none') }}
                                    </td>
                                    <td class="py-2.5 px-2 tabular-nums text-gray-500 whitespace-nowrap hidden md:table-cell">{{ $score->game?->game_version ?? '–' }}</td>
                                    <td class="py-2.5 ps-2 pe-4 sm:pe-6 text-right text-gray-500 whitespace-nowrap hidden sm:table-cell">{{ $score->created_at?->format('M j, Y') }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>

            <p class="mt-4 px-4 sm:px-0 text-sm text-gray-500">
                {{ __('The top :count scores. "Bosses" is how many bosses were defeated in that game. "Gear" is the strongest hunter set worn in it and how many of its pieces, which make the hunter tougher and his arrows hit harder; "none" is a game played without. "Version" is the version of the game it was played in: the game changes, and a score is a feat of its own version.', ['count' => config('game.leaderboard_size')]) }}
            </p>
        </div>
    </div>
</x-app-layout>
