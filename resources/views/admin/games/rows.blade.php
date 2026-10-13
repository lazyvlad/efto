{{-- A table of games ($games), used on the overview, an account's page and the games page --}}
@php
    $duration = fn (int $seconds) => sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
@endphp
<div class="overflow-x-auto">
    <table class="w-full text-sm whitespace-nowrap">
        <thead>
            <tr class="text-left text-gray-500 border-b border-gray-200">
                <th class="py-3 ps-4 sm:ps-6 pe-2 font-normal">{{ __('Started') }}</th>
                @unless ($hidePlayer ?? false)
                    <th class="py-3 px-2 font-normal">{{ __('Player') }}</th>
                @endunless
                <th class="py-3 px-2 font-normal">{{ __('Game') }}</th>
                <th class="py-3 px-2 text-right font-normal">{{ __('Score') }}</th>
                <th class="py-3 px-2 text-right font-normal">{{ __('Level') }}</th>
                <th class="py-3 px-2 text-right font-normal">{{ __('Bosses') }}</th>
                <th class="py-3 px-2 text-right font-normal">{{ __('Time') }}</th>
                <th class="py-3 px-2 text-right font-normal">{{ __('Coins') }}</th>
                <th class="py-3 px-2 font-normal">{{ __('Ended') }}</th>
                @if ($withScores ?? false)
                    <th class="py-3 ps-2 pe-4 sm:pe-6 font-normal"></th>
                @endif
            </tr>
        </thead>
        <tbody>
            @foreach ($games as $game)
                <tr class="border-b border-gray-200 last:border-0">
                    <td class="py-2.5 ps-4 sm:ps-6 pe-2 text-gray-500" title="{{ $game->started_at }}">{{ $game->started_at?->diffForHumans() }}</td>
                    @unless ($hidePlayer ?? false)
                        <td class="py-2.5 px-2">
                            @if ($game->user)
                                <a href="{{ route('admin.users.show', $game->user) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ $game->name }}</a>
                            @else
                                <span class="text-gray-600">{{ $game->name }}</span> <span class="text-xs text-gray-500">{{ __('guest') }}</span>
                            @endif
                        </td>
                    @endunless
                    <td class="py-2.5 px-2 text-gray-600">
                        {{ $game->faction ? ucfirst($game->faction) : '–' }}@if ($game->isBossRush()), {{ __('Boss Rush') }}@elseif ($game->start_zone > 1), {{ __('from zone :zone', ['zone' => $game->start_zone]) }}@endif
                        <span class="text-xs text-gray-500">{{ $game->game_version }}</span>
                    </td>
                    <td class="py-2.5 px-2 text-right tabular-nums text-indigo-600">{{ number_format($game->score) }}</td>
                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $game->level }}</td>
                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ $game->boss_drops_count ?: '–' }}</td>
                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-600">{{ $duration((int) $game->game_time) }}</td>
                    <td class="py-2.5 px-2 text-right tabular-nums text-gray-600">{{ $game->coins ? \App\Support\Coins::format($game->coins) : '–' }}</td>
                    <td class="py-2.5 px-2">
                        @if ($game->isOpen())
                            <span class="text-gray-500">{{ __('still open') }}</span>
                        @elseif ($game->status === \App\Models\Game::ABANDONED)
                            <span class="text-gray-500">{{ __('left mid-game') }}</span>
                        @elseif ($game->offline)
                            <span class="text-amber-600">{{ __('ran without the server') }}</span>
                        @else
                            <span class="text-gray-800">{{ __('played out') }}</span>
                        @endif
                    </td>
                    @if ($withScores ?? false)
                        <td class="py-2.5 ps-2 pe-4 sm:pe-6 text-right">
                            @if ($game->scoreEntry)
                                <form method="POST" action="{{ route('admin.scores.destroy', $game->scoreEntry) }}"
                                      onsubmit="return confirm(@js(__('Take this score off the leaderboard?')))">
                                    @csrf
                                    @method('DELETE')
                                    <button class="underline text-red-600 hover:text-red-700">{{ __('Off the leaderboard') }}</button>
                                </form>
                            @endif
                        </td>
                    @endif
                </tr>
            @endforeach
        </tbody>
    </table>
</div>
