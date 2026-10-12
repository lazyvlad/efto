<x-guest-layout>
    <div class="text-sm text-gray-600 space-y-3">
        <p class="text-gray-900">{{ __('The emails this site sends') }}</p>
        <ul class="list-disc ps-5 space-y-1">
            @foreach ($emails as $email)
                <li><a href="{{ route('mail.preview', ['email' => $email]) }}" class="underline text-indigo-600 hover:text-indigo-700">{{ $email }}</a></li>
            @endforeach
        </ul>
    </div>
</x-guest-layout>
