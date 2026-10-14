<x-app-layout>
    <x-slot name="header">
        @include('admin.header', ['title' => __('What\'s new')])
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @include('admin.status')

            <form method="POST" action="{{ $post->exists ? route('admin.news.update', $post) : route('admin.news.store') }}"
                  class="bg-white shadow sm:rounded-lg p-4 sm:p-6 space-y-4 text-sm">
                @csrf
                @if ($post->exists)
                    @method('PUT')
                @endif

                <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 class="text-lg text-gray-900">{{ $post->exists ? __('Change the post') : __('Write a post') }}</h3>
                    <a href="{{ route('admin.news.index') }}" class="text-gray-500 hover:text-gray-800">{{ __('All posts') }}</a>
                </div>

                <div class="grid gap-4 sm:grid-cols-[1fr_10rem]">
                    <div>
                        <x-input-label for="title" :value="__('Title')" />
                        <x-text-input id="title" type="text" name="title" :value="old('title', $post->title)" required maxlength="150" class="block mt-1 w-full" />
                        <x-input-error :messages="$errors->get('title')" class="mt-1" />
                    </div>
                    <div>
                        <x-input-label for="version" :value="__('Version (optional)')" />
                        <x-text-input id="version" type="text" name="version" :value="old('version', $post->version)" maxlength="20" placeholder="3.0" class="block mt-1 w-full" />
                    </div>
                </div>

                <div>
                    <x-input-label for="body" :value="__('Post')" />
                    <textarea id="body" name="body" rows="24" required maxlength="30000"
                              class="block mt-1 w-full font-mono text-[13px] border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">{{ old('body', $post->body) }}</textarea>
                    <x-input-error :messages="$errors->get('body')" class="mt-1" />
                    <p class="mt-1 text-gray-500">{{ __('Markdown: ## for a heading, **bold**, *italic*, [a link](https://example.com), lines starting with - for a list.') }}</p>
                </div>

                <label class="flex items-center gap-2 text-gray-800">
                    <input type="hidden" name="publish" value="0">
                    <input type="checkbox" name="publish" value="1" @checked(old('publish', $post->published_at !== null))
                           class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    {{ __('Published: on the What\'s new page for everyone') }}
                </label>

                <div class="flex flex-wrap items-center gap-3 pt-2">
                    <x-primary-button>{{ __('Save') }}</x-primary-button>
                    @if ($post->isPublished())
                        <a href="{{ route('whats-new') }}#post-{{ $post->id }}" class="text-indigo-600 underline hover:text-indigo-700">{{ __('See it on the page') }}</a>
                    @endif
                </div>
            </form>

            @if ($post->exists)
                <div class="bg-white shadow sm:rounded-lg p-4 sm:p-6 text-sm">
                    <p class="text-gray-500 mb-3">{{ __('As players will see it (the last saved version)') }}</p>
                    <h3 class="text-2xl text-gray-900 mb-4">{{ $post->title }}</h3>
                    <div class="news-body">{!! $post->html() !!}</div>
                </div>

                <form method="POST" action="{{ route('admin.news.destroy', $post) }}"
                      onsubmit="return confirm(@js(__('Delete this post for good?')))">
                    @csrf
                    @method('DELETE')
                    <x-danger-button>{{ __('Delete the post') }}</x-danger-button>
                </form>
            @endif
        </div>
    </div>
</x-app-layout>
