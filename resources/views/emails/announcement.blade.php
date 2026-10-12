<x-mail::message>
# {{ $subject }}

{{ __('Hello :name,', ['name' => $name]) }}

{!! $body !!}

@if ($buttonText)
<x-mail::button :url="$buttonUrl">
{{ $buttonText }}
</x-mail::button>
@endif

<x-slot:footer>
{{ __('You get this because you have an account at :app.', ['app' => config('app.name')]) }} [{{ __('Stop these emails') }}]({{ $unsubscribeUrl }})
</x-slot:footer>
</x-mail::message>
