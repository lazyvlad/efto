import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
    ],

    theme: {
        extend: {
            fontFamily: {
                // Running text; the display face is applied to headings, labels and buttons in app.css
                sans: ['"Trebuchet MS"', '"Lucida Grande"', '"Segoe UI"', ...defaultTheme.fontFamily.sans],
                display: ['Marcellus', 'Georgia', 'serif'],
            },

            // The site shares the game's look: dark stone panels, gold trim. Rather than
            // rewriting every view, the palette the views already use is re-pointed:
            // "white" is the panel surface, the gray scale runs light-on-dark, indigo is gold.
            colors: {
                white: '#1b1714',
                gray: {
                    50: '#241d16',
                    100: '#0e0c0a',
                    200: '#3a2f1c',
                    300: '#5d4c25',
                    400: '#8c8169',
                    500: '#a89c82',
                    600: '#b9ad92',
                    700: '#e8c66a',
                    800: '#f4ecd8',
                    900: '#fff8e6',
                },
                indigo: {
                    50: '#3a2a12',
                    100: '#4a3413',
                    400: '#d8b95a',
                    500: '#f1d98a',
                    600: '#ffd100',
                    700: '#ffe066',
                    800: '#fff0a8',
                },
                green: {
                    600: '#5fdc5f',
                },
                red: {
                    400: '#ff7a6a',
                    500: '#d32f22',
                    600: '#b3231a',
                    700: '#8e120c',
                },
            },
        },
    },

    plugins: [forms],
};
