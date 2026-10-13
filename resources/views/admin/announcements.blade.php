<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('Announcements')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <form method="POST" action="{{ route('admin.announcements.send') }}" class="bg-white shadow sm:rounded-lg p-4 sm:p-6 space-y-4 text-sm">
                @csrf
                <div>
                    <h3 class="text-lg text-gray-900">{{ __('Write to the players') }}</h3>
                    <p class="text-gray-600">
                        {{ trans_choice('{0} Nobody would receive it yet: no player has both confirmed their email address and kept news emails on.|{1} It goes to :count player: those who confirmed their email address, kept news emails on and are not blocked.|[2,*] It goes to :count players: those who confirmed their email address, kept news emails on and are not blocked.', $recipients, ['count' => $recipients]) }}
                        {{ __('Every copy carries a link to stop receiving them.') }}
                    </p>
                </div>

                <div>
                    <x-input-label for="subject" :value="__('Subject, also the heading of the email')" />
                    <x-text-input id="subject" type="text" name="subject" :value="old('subject')" required maxlength="150" class="block mt-1 w-full" />
                </div>

                <div>
                    <x-input-label for="body" :value="__('Message')" />
                    <textarea id="body" name="body" rows="10" required maxlength="10000"
                              class="block mt-1 w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('body') }}</textarea>
                    <p class="mt-1 text-gray-500">{{ __('Markdown works: **bold**, *italic*, [a link](https://example.com), lines starting with - for a list. The email opens with the player\'s name.') }}</p>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <x-input-label for="button_text" :value="__('Button under the message (optional)')" />
                        <x-text-input id="button_text" type="text" name="button_text" :value="old('button_text')" maxlength="60" placeholder="{{ __('Play now') }}" class="block mt-1 w-full" />
                    </div>
                    <div>
                        <x-input-label for="button_url" :value="__('Where the button leads (the game, if empty)')" />
                        <x-text-input id="button_url" type="text" name="button_url" :value="old('button_url')" maxlength="255" placeholder="{{ route('home') }}" class="block mt-1 w-full" />
                    </div>
                </div>

                <div class="flex flex-wrap gap-3 pt-2">
                    <x-secondary-button type="submit" name="to" value="me">{{ __('Send to me only') }}</x-secondary-button>
                    <x-primary-button name="to" value="everyone"
                                      onclick="return confirm(@js(trans_choice('Send this to :count player?|Send this to :count players?', $recipients, ['count' => $recipients])))">
                        {{ __('Send to everyone') }}
                    </x-primary-button>
                </div>
            </form>

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <h3 class="text-lg text-gray-900 px-4 sm:px-6 pt-4 sm:pt-6">{{ __('Sent before') }}</h3>
                @if ($sent->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('Nothing has been sent from here yet.') }}</p>
                @else
                    <ul class="px-4 sm:px-6 py-3 text-sm divide-y divide-gray-200">
                        @foreach ($sent as $announcement)
                            <li class="py-3">
                                <details>
                                    <summary class="cursor-pointer flex flex-wrap justify-between gap-x-6">
                                        <span class="text-gray-900">{{ $announcement->subject }}</span>
                                        <span class="text-gray-500">
                                            {{ trans_choice(':count player|:count players', $announcement->sent_to, ['count' => $announcement->sent_to]) }}@if ($announcement->failed), {{ __(':count failed', ['count' => $announcement->failed]) }}@endif
                                            · {{ $announcement->created_at?->format('M j, Y H:i') }}
                                            · {{ $announcement->user?->name ?? __('a deleted account') }}
                                        </span>
                                    </summary>
                                    <pre class="mt-3 whitespace-pre-wrap font-sans text-gray-600">{{ $announcement->body }}</pre>
                                </details>
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        </div>
    </div>
</x-app-layout>
