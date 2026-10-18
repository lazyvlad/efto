{{-- The Audio Cutter: the editor (public/tools-files/audio-cutter/editor.js) works on the ids
     below; everything happens in the browser, nothing is uploaded. Its encoders are the
     unchanged lamejs 1.2.1 and wasm-media-encoders 0.7.0, with their licences beside them. --}}
@php
    $files = 'tools-files/audio-cutter/';
    $version = fn (string $file) => asset($files.$file).'?v='.filemtime(public_path($files.$file));
@endphp

@push('head')
    @vite('resources/css/audio-cutter.css')
    <script defer src="{{ $version('vendor/WasmMediaEncoder.min.js') }}"></script>
    <script defer src="{{ $version('vendor/lame.min.js') }}"></script>
    <script defer src="{{ $version('editor.js') }}"></script>
@endpush

<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Audio Cutter') }}
        </h2>
    </x-slot>

    <div class="py-8 sm:py-10">
        <div class="audio-cutter max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5" data-ogg-wasm="{{ $version('vendor/ogg.wasm') }}">

            <section class="game-card p-4 sm:p-6 ac-intro">
                <div>
                    <p class="game-label">{{ __('I N P U T · Tools') }}</p>
                    <h3 class="game-heading text-2xl mt-1">{{ __('Cut precisely. Listen freely. Build your own track.') }}</h3>
                    <p class="mt-2 text-sm text-gray-600">{{ __('Open a recording, mark the part you want with the gold bar and save it, or copy several parts into one track. Everything happens in your browser: your audio is never uploaded.') }}</p>
                </div>
                <label class="btn ac-load" title="{{ __('Open an audio recording') }}">
                    <span data-icon="folder"></span><span>{{ __('Open audio') }}</span>
                    <input id="file" type="file" accept="audio/*">
                </label>
            </section>

            {{-- The game's own sounds (config tools.audio-cutter.samples): one press opens one --}}
            <section class="game-card p-4 sm:p-6 ac-samples" aria-labelledby="ac-samples-heading">
                <p class="game-label">{{ __('Or start from the game') }}</p>
                <h3 class="game-heading text-xl mt-1" id="ac-samples-heading">{{ __('Sounds from I N P U T') }}</h3>
                <p class="mt-1 text-sm text-gray-600">{{ __('The voice lines and sound effects you hear in the game. Press one to open it here.') }}</p>
                @foreach (config('tools.audio-cutter.samples') as $group => $samples)
                    <div class="ac-sample-group">
                        <p class="game-label">{{ __($group) }}</p>
                        <div class="ac-sample-list">
                            @foreach ($samples as $sample)
                                <button type="button" class="ac-sample" aria-pressed="false"
                                        data-sample-url="{{ asset('game/assets/audio/'.$sample['file']) }}"
                                        data-sample-name="{{ __($sample['name']) }}">
                                    <i data-icon="play"></i>{{ __($sample['name']) }}@if (! empty($sample['explicit']))<span class="ac-explicit" title="{{ __('Has swearing in it') }}">18+</span>@endif
                                </button>
                            @endforeach
                        </div>
                    </div>
                @endforeach
            </section>

            <section class="panel ac-panel">
                <div class="ac-panel-head">
                    <h3 class="game-heading"><span class="ac-dot ac-gold"></span>{{ __('The recording') }}</h3>
                    <div class="ac-toolbar">
                        <button id="play" class="ac-icon ac-primary" aria-label="{{ __('Play the cut') }}" title="{{ __('Play the cut') }}"></button>
                        <button id="stop" class="ac-icon" aria-label="{{ __('Stop') }}" title="{{ __('Stop') }}"></button>
                        <span class="ac-divider"></span>
                        <label class="ac-mode"><input autocomplete="off" type="radio" id="select-mode" name="pointer-mode" checked><span><i data-icon="cut"></i>{{ __('Cut') }}</span></label>
                        <label class="ac-mode ac-mode-listen"><input autocomplete="off" type="radio" id="listen-mode" name="pointer-mode"><span><i data-icon="headphones"></i>{{ __('Listen') }}</span></label>
                        <label class="ac-toggle" id="lock-label" title="{{ __('Lock the cut') }}"><input autocomplete="off" type="checkbox" id="lock-selection" aria-label="{{ __('Lock the cut') }}"><span id="lock-icon"></span></label>
                        <label class="ac-toggle ac-link" id="link-label" title="{{ __('Link the cut and listen ranges') }}"><input autocomplete="off" type="checkbox" id="link-ranges" aria-label="{{ __('Link the cut and listen ranges') }}"><span id="link-icon"></span></label>
                        <span id="lock-note" class="sr-only" aria-live="polite"></span>
                    </div>
                </div>

                <div class="ac-wavebox">
                    <canvas id="listen-lane-top" class="ac-lane" aria-label="{{ __('Listen range bar: click to place it, drag to move it, drag its blue ends to resize it.') }}"></canvas>
                    <canvas id="cut-lane" class="ac-lane" aria-label="{{ __('Cut bar: click to place it, drag to move it, drag its gold ends to resize it. Not while the cut is locked.') }}"></canvas>
                    <canvas id="wave" aria-label="{{ __('The recording\'s waveform. The mouse wheel zooms at the pointer; Shift and the wheel scroll.') }}"></canvas>
                </div>
                <div class="ac-timeline">
                    <div class="ac-toolbar">
                        <button id="source-zoom-out" class="ac-icon ac-quiet" title="{{ __('Zoom out') }}" aria-label="{{ __('Zoom out') }}"></button>
                        <button id="source-zoom-in" class="ac-icon ac-quiet" title="{{ __('Zoom in') }}" aria-label="{{ __('Zoom in') }}"></button>
                        <button id="source-zoom-all" class="ac-icon ac-quiet" title="{{ __('Show the whole recording') }}" aria-label="{{ __('Show the whole recording') }}"></button>
                        <button id="source-zoom-selection" class="ac-icon ac-quiet" title="{{ __('Zoom to the cut') }}" aria-label="{{ __('Zoom to the cut') }}"></button>
                        <button id="all" class="ac-icon ac-quiet" title="{{ __('Cut the whole recording') }}" aria-label="{{ __('Cut the whole recording') }}"></button>
                    </div>
                    <input autocomplete="off" id="source-scroll" aria-label="{{ __('Scroll the recording') }}" type="range" min="0" max="0" step="0.001" value="0">
                    <span id="source-view" class="ac-time"></span>
                </div>
                <p class="ac-hint">{{ __('Gold bar: the cut · Blue bar: what you listen to · Link them to move both together · Mouse wheel: zoom') }}</p>

                <div class="ac-ranges">
                    <div class="ac-range ac-cut">
                        <div class="ac-range-title"><span><i data-icon="cut"></i>{{ __('The cut') }}</span><span id="duration" class="sr-only"></span></div>
                        <div class="ac-fields">
                            <label>{{ __('Start') }} <small>s</small><input autocomplete="off" id="start" type="number" min="0" step="0.001" value="0" title="{{ __('Moving the start keeps the length when it can') }}"></label>
                            <label>{{ __('End') }} <small>s</small><input autocomplete="off" id="end" type="number" min="0" step="0.001" value="0"></label>
                            <label>{{ __('Length') }} <small>s</small><input autocomplete="off" id="selection-length" type="number" min="0" step="0.001" value="0" title="{{ __('The end becomes the start plus this') }}"></label>
                        </div>
                        <button id="copy-output" class="btn ac-copy"><i data-icon="append"></i>{{ __('Copy to the track') }}</button>
                    </div>
                    <div class="ac-range ac-listen">
                        <div class="ac-range-title"><span><i data-icon="headphones"></i>{{ __('Listen range') }}</span><button id="listen-play" class="ac-icon ac-quiet" aria-label="{{ __('Play the listen range') }}" title="{{ __('Play only the blue listen range') }}"></button><span id="listen-duration" class="sr-only"></span></div>
                        <div class="ac-fields">
                            <label>{{ __('Start') }} <small>s</small><input autocomplete="off" id="listen-at" type="number" min="0" step="0.001" value="0" title="{{ __('Moving the start keeps the length when it can') }}"></label>
                            <label>{{ __('End') }} <small>s</small><input autocomplete="off" id="listen-end" type="number" min="0" step="0.001" value="0"></label>
                            <label>{{ __('Length') }} <small>s</small><input autocomplete="off" id="listen-length" type="number" min="0" step="0.001" value="0" title="{{ __('The end becomes the start plus this') }}"></label>
                        </div>
                        <p class="ac-hint">{{ __('Listen to any part without moving your cut.') }}</p>
                    </div>
                </div>

                <div class="ac-export">
                    <label class="ac-filename">{{ __('File name') }}<input autocomplete="off" id="name" type="text" value="audio-clip-01"></label>
                    <label class="ac-fade"><input autocomplete="off" id="fade" type="checkbox">{{ __('5 ms fade at the edges') }}</label>
                    <span class="game-label ac-export-label">{{ __('Save the cut') }}</span>
                    <button id="save" class="ac-format">WAV</button>
                    <button id="save-mp3" class="ac-format">MP3</button>
                    <button id="save-ogg" class="ac-format">OGG</button>
                </div>
            </section>

            <section class="panel ac-panel">
                <div class="ac-panel-head">
                    <h3 class="game-heading"><span class="ac-dot ac-green"></span>{{ __('Your track') }} <small id="output-duration" class="ac-small"></small></h3>
                    <div class="ac-toolbar">
                        <button id="output-play" class="ac-icon ac-primary" aria-label="{{ __('Play the track') }}" title="{{ __('Play the track') }}"></button>
                        <button id="output-stop" class="ac-icon" aria-label="{{ __('Stop') }}" title="{{ __('Stop') }}"></button>
                        <button id="output-undo" class="ac-icon" aria-label="{{ __('Undo') }}" title="{{ __('Undo the last change to the track') }}"></button>
                        <button id="output-clear" class="ac-icon" aria-label="{{ __('Clear the track') }}" title="{{ __('Clear the track') }}"></button>
                    </div>
                </div>
                <div class="ac-wavebox"><canvas id="output-wave" aria-label="{{ __('The track\'s waveform. The mouse wheel zooms; Shift and the wheel scroll.') }}"></canvas></div>
                <div class="ac-timeline">
                    <div class="ac-toolbar">
                        <button id="output-zoom-out" class="ac-icon ac-quiet" title="{{ __('Zoom out') }}" aria-label="{{ __('Zoom the track out') }}"></button>
                        <button id="output-zoom-in" class="ac-icon ac-quiet" title="{{ __('Zoom in') }}" aria-label="{{ __('Zoom the track in') }}"></button>
                        <button id="output-zoom-all" class="ac-icon ac-quiet" title="{{ __('Show the whole track') }}" aria-label="{{ __('Show the whole track') }}"></button>
                    </div>
                    <input autocomplete="off" id="output-scroll" aria-label="{{ __('Scroll the track') }}" type="range" min="0" max="0" step="0.001" value="0">
                    <span id="output-view" class="ac-time"></span>
                </div>
                <div id="output-parts" class="ac-parts"></div>
                <div class="ac-output-footer">
                    <p class="ac-hint">{{ __('Parts play one after another. Save your track before you close this page: nothing is kept.') }}</p>
                    <div class="ac-toolbar">
                        <span class="game-label">{{ __('Save the track') }}</span>
                        <button id="output-wav" class="ac-format">WAV</button>
                        <button id="output-mp3" class="ac-format">MP3</button>
                        <button id="output-ogg" class="ac-format">OGG</button>
                    </div>
                </div>
            </section>

            <p class="ac-status" id="status" role="status" aria-live="polite">{{ __('Loading…') }}</p>

            <section class="game-card p-4 sm:p-6" id="saved" hidden>
                <h3 class="game-heading text-lg">{{ __('Saved') }}</h3>
                <div id="clips" class="ac-clips"></div>
            </section>

            <p class="px-4 sm:px-0 text-sm text-gray-500">
                {{ __('Processed in your browser · WAV, MP3 192 kbps, OGG · The original recording is never changed.') }}
                {!! __('MP3 encoding: :lame (lamejs, LGPL); OGG encoding: wasm-media-encoders (MIT). :licences.', [
                    'lame' => '<a class="underline" href="https://lame.sourceforge.net/" target="_blank" rel="noopener noreferrer">LAME</a>',
                    'licences' => '<a class="underline" href="'.e(asset($files.'licenses/THIRD-PARTY-NOTICES.txt')).'">'.e(__('Licences')).'</a>',
                ]) !!}
            </p>
        </div>
    </div>
</x-app-layout>
