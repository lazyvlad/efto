@php
    // The card shown when a page of the site is posted in a chat or on social media
    $socialDescription = __('A Warcraft-style catching game from the guild I N P U T. Catch the loot, dodge the rest and bring down ten bosses.');
@endphp
<meta name="description" content="{{ $socialDescription }}">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name') }}">
        <meta property="og:title" content="{{ config('app.name') }}">
        <meta property="og:description" content="{{ $socialDescription }}">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ \App\Support\Fingerprint::asset('images/input-card.jpg') }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="{{ __('The gold I N P U T logo over a map of the world') }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ config('app.name') }}">
        <meta name="twitter:description" content="{{ $socialDescription }}">
        <meta name="twitter:image" content="{{ \App\Support\Fingerprint::asset('images/input-card.jpg') }}">
