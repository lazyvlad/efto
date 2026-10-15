{{-- The heading of every admin page: where you are, and the way to the other pages, in
     categories (App\Support\AdminMenu): the categories on top, the open one's pages below --}}
@php
    $menu = \App\Support\AdminMenu::categories();
    $open = \App\Support\AdminMenu::current();
    $overview = request()->routeIs('admin.dashboard');
@endphp
<div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            @if ($open)<span class="text-gray-500 font-normal">{{ $menu[$open]['label'] }} ›</span> @endif{{ $title }}
        </h2>

        <nav class="admin-categories flex flex-wrap gap-1 text-sm" aria-label="{{ __('Admin sections') }}">
            <a href="{{ route('admin.dashboard') }}" class="admin-category {{ $overview ? 'is-on' : '' }}" @if ($overview) aria-current="page" @endif>{{ __('Overview') }}</a>
            @foreach ($menu as $key => $category)
                <a href="{{ route($category['pages'][0]['route']) }}" class="admin-category {{ $open === $key ? 'is-on' : '' }}">{{ $category['label'] }}</a>
            @endforeach
        </nav>
    </div>

    @if ($open && count($menu[$open]['pages']) > 1)
        <nav class="flex flex-wrap gap-x-6 gap-y-1 text-sm border-t border-gray-200 pt-2" aria-label="{{ $menu[$open]['label'] }}">
            @foreach ($menu[$open]['pages'] as $page)
                @php $here = request()->routeIs($page['active']); @endphp
                <a href="{{ route($page['route']) }}" class="{{ $here ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800' }}" @if ($here) aria-current="page" @endif>{{ $page['label'] }}</a>
            @endforeach
        </nav>
    @endif
</div>
