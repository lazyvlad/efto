<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('About') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-12">
        <div class="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">
            {{-- The guild's short film. It starts only when asked: it has sound. --}}
            <video class="about-film shadow sm:rounded-lg" controls playsinline preload="metadata"
                   src="{{ asset('videos/input-hero.mp4') }}#t=0.1">
                <a href="{{ asset('videos/input-hero.mp4') }}">{{ __('Watch the I N P U T film') }}</a>
            </video>

            <div class="bg-white shadow sm:rounded-lg p-6 sm:p-8 space-y-4 text-gray-600">
                <h3 class="text-lg text-gray-900">{{ __('Who is I N P U T?') }}</h3>
                <p>
                    {{ __('I N P U T is a guild in World of Warcraft. We play Classic content.') }}
                </p>
                <p>
                    {{ __('This game was made on our Discord, as something for guildies to joke about. It grew from there: zones, bosses, loot, and a few of our own running gags.') }}
                </p>
                <p>
                    {{ __('It is made by the guild for the guild, and anyone else who finds it is welcome to play.') }}
                </p>
            </div>

            <div class="bg-white shadow sm:rounded-lg p-6 sm:p-8 space-y-4 text-gray-600">
                <h3 class="text-lg text-gray-900">{{ __('The game') }}</h3>
                <p>
                    {{ __('You are a hunter. Loot falls from the sky; catch what is good, dodge or shoot what is not, and bring down the boss at the end of every zone. Beat the tenth boss and the game is won.') }}
                </p>
                <p>
                    {{ __('You can play without an account. With one, what you earn stays with you: coins, boss loot and the pieces of the three hunter sets.') }}
                </p>
                <p class="flex flex-wrap gap-x-6 gap-y-2">
                    <a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Play') }}</a>
                    <a href="{{ route('items') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('All the items and bosses') }}</a>
                    <a href="{{ route('highscores') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('High scores') }}</a>
                </p>
            </div>

            <p class="px-4 sm:px-0 text-sm text-gray-500">
                {{ __('I N P U T is a fan project. World of Warcraft and the names from it belong to Blizzard Entertainment; this game is not made, endorsed or supported by them.') }}
            </p>
        </div>
    </div>
</x-app-layout>
