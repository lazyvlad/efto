import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                // The Audio Cutter's page (resources/views/tools/audio-cutter.blade.php)
                'resources/css/audio-cutter.css',
                // The game itself: its scripts in one file and its styles in another, each
                // named after its contents (GameController puts them on the game's page)
                'game/game-modular.js',
                'game/styles/game.css',
            ],
            refresh: true,
        }),
    ],

    experimental: {
        // Files that scripts load later (the image cropper, the password word lists) are
        // addressed relative to the script that asks for them, not from the domain root, so
        // one build works at a domain root and in a sub-folder alike.
        renderBuiltUrl(filename, { hostType }) {
            // The same for what a stylesheet points at (the game's fonts)
            if (hostType === 'js' || hostType === 'css') {
                return { relative: true };
            }
        },
    },
});
