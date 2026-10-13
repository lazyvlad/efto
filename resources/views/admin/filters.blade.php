{{-- Search box and "show only" links above a list. $route, $search, $show, $choices --}}
<div class="bg-white shadow sm:rounded-lg p-4 sm:px-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
    <form method="GET" action="{{ route($route) }}" class="flex gap-2">
        @if ($show)
            <input type="hidden" name="show" value="{{ $show }}">
        @endif
        <x-text-input type="search" name="q" :value="$search" placeholder="{{ $placeholder }}" class="!py-1.5 w-56" />
        <x-secondary-button type="submit" class="!py-1">{{ __('Search') }}</x-secondary-button>
    </form>

    <div class="flex flex-wrap gap-x-4 gap-y-1">
        @foreach (['' => __('All')] + $choices as $value => $label)
            <a href="{{ route($route, array_filter(['q' => $search, 'show' => $value])) }}"
               class="{{ (string) $show === (string) $value ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800' }}">{{ $label }}</a>
        @endforeach
    </div>
</div>
