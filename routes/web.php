<?php

use App\Http\Controllers\GameController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

// The game is the home page for now; more pages will hang off this later
Route::redirect('/', 'play');

Route::get('/play', [GameController::class, 'play'])->name('play');

// High scores. Open to guests; a logged-in player's scores are tied to their account.
Route::get('/api/scores', [ScoreController::class, 'index'])->name('scores.index');
Route::post('/api/scores', [ScoreController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('scores.store');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
