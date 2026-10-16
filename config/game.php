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

    // How the game runs on players' machines (game/utils/perfProbe.js): the share of page loads
    // that quietly send a summary every 30 seconds of play, and the days they are kept
    'perf_share' => (float) env('GAME_PERF_SHARE', 0.05),
    'perf_keep_days' => 30,

];
