import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
    ],

    experimental: {
        // Files that scripts load later (the image cropper, the password word lists) are
        // addressed relative to the script that asks for them, not from the domain root, so
        // one build works at a domain root and in a sub-folder alike.
        renderBuiltUrl(filename, { hostType }) {
            if (hostType === 'js') {
                return { relative: true };
            }
        },
    },
});
