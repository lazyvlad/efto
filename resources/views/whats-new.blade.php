<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('What\'s new') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">
            @forelse ($posts as $post)
                <article id="post-{{ $post->id }}" class="bg-white shadow sm:rounded-lg p-6 sm:p-8">
                    <header class="mb-5 pb-4 border-b border-gray-200">
                        <h3 class="text-2xl text-gray-900">
                            <a href="#post-{{ $post->id }}" class="hover:text-indigo-700">{{ $post->title }}</a>
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">
                            <time datetime="{{ $post->published_at->toDateString() }}">{{ $post->published_at->format('F j, Y') }}</time>
                            @if ($post->version)
                                · {{ __('Version :version', ['version' => $post->version]) }}
                            @endif
                        </p>
                    </header>
                    <div class="news-body">{!! $post->html() !!}</div>
                </article>
            @empty
                <div class="bg-white shadow sm:rounded-lg p-6 sm:p-8 text-gray-600">
                    {{ __('Nothing posted yet. News about the game will be here.') }}
                </div>
            @endforelse

            @if ($posts->hasPages())
                <div class="px-4 sm:px-0">{{ $posts->links() }}</div>
            @endif

            <p class="px-4 sm:px-0">
                <a href="{{ route('home') }}" class="btn">{{ __('Play') }}</a>
            </p>
        </div>
    </div>
</x-app-layout>
