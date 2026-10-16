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

    // Where the built game's pictures and sounds are served from instead of this server: the
    // address of its folder in the S3 bucket they are uploaded to (scripts/upload-game-assets.sh),
    // e.g. https://<bucket>.s3.eu-west-1.amazonaws.com/game. Empty: from this server.
    'asset_url' => rtrim((string) env('GAME_ASSET_URL', ''), '/'),

    // Scores shown on the leaderboard
    'leaderboard_size' => 100,

    // How the game runs on players' machines (game/utils/perfProbe.js): the share of page loads
    // that quietly send a summary every 30 seconds of play, and the days they are kept
    'perf_share' => (float) env('GAME_PERF_SHARE', 0.05),
    'perf_keep_days' => 30,

];
