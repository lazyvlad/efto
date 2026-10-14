<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('What\'s new')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <div class="bg-white shadow sm:rounded-lg overflow-hidden">
                <div class="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 pt-4 sm:pt-6">
                    <div>
                        <h3 class="text-lg text-gray-900">{{ __('Posts') }}</h3>
                        <p class="text-sm text-gray-600">
                            {{ __('What players read on the') }} <a href="{{ route('whats-new') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('What\'s new page') }}</a>.
                            {{ __('Drafts are seen only here.') }}
                        </p>
                    </div>
                    <a href="{{ route('admin.news.create') }}" class="btn">{{ __('Write a post') }}</a>
                </div>

                @if ($posts->isEmpty())
                    <p class="p-6 text-sm text-gray-600">{{ __('Nothing written yet.') }}</p>
                @else
                    <ul class="px-4 sm:px-6 py-3 text-sm divide-y divide-gray-200">
                        @foreach ($posts as $post)
                            <li class="py-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                                <a href="{{ route('admin.news.edit', $post) }}" class="text-gray-900 hover:text-indigo-700">
                                    {{ $post->title }}
                                    @if ($post->version)<span class="text-gray-500">· {{ $post->version }}</span>@endif
                                </a>
                                <span class="text-gray-500">
                                    @if ($post->isPublished())
                                        {{ __('Published :date', ['date' => $post->published_at->format('M j, Y')]) }}
                                    @else
                                        <span class="text-indigo-600">{{ __('Draft') }}</span>
                                    @endif
                                    · {{ $post->user?->name ?? __('a deleted account') }}
                                </span>
                            </li>
                        @endforeach
                    </ul>
                @endif
            </div>
        </div>
    </div>
</x-app-layout>
