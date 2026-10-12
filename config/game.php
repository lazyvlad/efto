<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Which copy of the game /play serves
    |--------------------------------------------------------------------------
    |
    | "build"  - the built game in public/game (minified, committed to git).
    | "source" - the unbuilt files in game/, through the public/game-src link.
    |            For development only: edit a file, reload the page.
    |
    */

    'serve' => env('GAME_SERVE', 'build'),

    // Scores shown on the leaderboard
    'leaderboard_size' => 100,

];
