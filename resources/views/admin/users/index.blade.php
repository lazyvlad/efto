<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Accounts')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            @include('admin.filters', [
                'route' => 'admin.users.index',
                'placeholder' => __('Name, email or Discord name'),
                'choices' => [
                    'unactivated' => __('Not activated'),
                    'discord' => __('With Discord'),
                    'blocked' => __('Blocked'),
                    'admins' => __('Admins'),
                ],
            ])

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                @if ($users->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('No accounts match.') }}</p>
                @else
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm whitespace-nowrap">
                            <thead>
                                <tr class="text-left text-gray-500 border-b border-gray-200">
                                    <th class="py-3 ps-4 sm:ps-6 pe-2 font-normal">{{ __('Player') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Email') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Discord') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('State') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Games') }}</th>
                                    <th class="py-3 px-2 text-right font-normal">{{ __('Purse') }}</th>
                                    <th class="py-3 px-2 font-normal">{{ __('Last game') }}</th>
                                    <th class="py-3 ps-2 pe-4 sm:pe-6 font-normal">{{ __('Registered') }}</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($users as $user)
                                    <tr class="border-b border-gray-200 last:border-0">
                                        <td class="py-2.5 ps-4 sm:ps-6 pe-2">
                                            <a href="{{ route('admin.users.show', $user) }}" class="flex items-center gap-3 text-indigo-600 hover:text-indigo-700">
                                                <x-avatar :user="$user" class="h-7 w-7 text-xs shrink-0" />
                                                <span class="underline">{{ $user->name }}</span>
                                            </a>
                                        </td>
                                        <td class="py-2.5 px-2 text-gray-600">{{ $user->email }}</td>
                                        <td class="py-2.5 px-2 text-gray-600">{{ $user->discord_name ?? '–' }}</td>
                                        <td class="py-2.5 px-2">@include('admin.users.state')</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-800">{{ number_format($user->games_count) }}</td>
                                        <td class="py-2.5 px-2 text-right tabular-nums text-gray-600">{{ \App\Support\Coins::format((int) $user->coins) }}</td>
                                        <td class="py-2.5 px-2 text-gray-500">{{ $user->games_max_started_at ? \Illuminate\Support\Carbon::parse($user->games_max_started_at)->diffForHumans() : '–' }}</td>
                                        <td class="py-2.5 ps-2 pe-4 sm:pe-6 text-gray-500">{{ $user->created_at?->format('M j, Y') }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </div>

            {{ $users->links() }}
        </div>
    </div>
</x-app-layout>
