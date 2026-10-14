{{-- The heading of every admin page: where you are, and the way to the other pages --}}
<div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
    <h2 class="font-semibold text-xl text-gray-800 leading-tight">{{ $title }}</h2>

    <nav class="flex gap-6 text-sm">
        @foreach (['admin.dashboard' => __('Overview'), 'admin.users.index' => __('Accounts'), 'admin.games.index' => __('Games'), 'admin.announcements.index' => __('Announcements'), 'admin.news.index' => __('What\'s new'), 'admin.settings.edit' => __('Settings')] as $name => $label)
            <a href="{{ route($name) }}"
               class="{{ request()->routeIs(Str::beforeLast($name, '.').($name === 'admin.dashboard' ? '.dashboard' : '.*')) ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-800' }}">{{ $label }}</a>
        @endforeach
    </nav>
</div>
