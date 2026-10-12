<x-guest-layout>
    <div class="text-sm text-gray-600 space-y-3">
        <p class="text-gray-900">{{ __('You will get no more news by email.') }}</p>
        <p>{{ __('Emails about your account itself, such as a password reset, are still sent when you ask for them. You can turn the news back on in your profile.') }}</p>
        <p><a href="{{ route('home') }}" class="underline text-indigo-600 hover:text-indigo-700">{{ __('Back to the game') }}</a></p>
    </div>
</x-guest-layout>
