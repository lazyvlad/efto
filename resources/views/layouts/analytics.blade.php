{{-- Google Analytics, where an id is set (GOOGLE_ANALYTICS_ID). Not on the admin pages. --}}
@if (config('services.google.analytics') && ! request()->routeIs('admin.*'))
<script async src="https://www.googletagmanager.com/gtag/js?id={{ config('services.google.analytics') }}"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', @js(config('services.google.analytics')));
        </script>
@endif
