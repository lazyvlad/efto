<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Tools') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-10">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <section class="game-card p-4 sm:p-6">
                <p class="game-label">{{ trans_choice('{1} One tool so far|[2,*] :count tools', count(config('tools')), ['count' => count(config('tools'))]) }}</p>
                <h3 class="game-heading text-2xl mt-1">{{ __('Tools from I N P U T') }}</h3>
                <p class="mt-2 text-sm text-gray-600">{{ __('Small things made for the guild and anyone else who needs them. Free, no account needed.') }}</p>

                <div class="mt-5 grid gap-4 sm:grid-cols-2">
                    @foreach (config('tools') as $tool)
                        <a href="{{ route($tool['route']) }}" class="tool-card game-item !items-start !p-4">
                            <div class="flex-1 min-w-0">
                                <div class="game-heading text-xl">{{ __($tool['name']) }}</div>
                                <p class="mt-1 text-sm text-gray-600">{{ __($tool['summary']) }}</p>
                                <ul class="mt-3 flex flex-wrap gap-2">
                                    @foreach ($tool['notes'] as $note)
                                        <li class="game-label !normal-case !tracking-normal text-xs px-2 py-0.5 border border-gray-300 rounded">{{ __($note) }}</li>
                                    @endforeach
                                </ul>
                            </div>
                            <span class="btn !py-1 !text-sm shrink-0 self-center">{{ __('Open') }}</span>
                        </a>
                    @endforeach
                </div>
            </section>
        </div>
    </div>
</x-app-layout>
