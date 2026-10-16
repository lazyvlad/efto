<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Guests who have not played for a week are let go (App\Support\GuestHunter)
Artisan::command('input:prune-guests', function () {
    $this->info(\App\Support\GuestHunter::prune().' guest accounts let go.');
})->purpose('Let go of guest accounts not played for a week');

\Illuminate\Support\Facades\Schedule::command('input:prune-guests')->daily();

// How the game ran on players' machines is kept a month (App\Models\PerfSample)
Artisan::command('input:prune-perf', function () {
    $gone = \App\Models\PerfSample::where('created_at', '<', now()->subDays((int) config('game.perf_keep_days')))->delete();
    $this->info($gone.' performance samples let go.');
})->purpose('Let go of performance samples older than a month');

\Illuminate\Support\Facades\Schedule::command('input:prune-perf')->daily();
