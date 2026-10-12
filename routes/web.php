<?php

use App\Http\Controllers\AvatarController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

// The landing page is the site header around the game; /play is the game on its own
Route::get('/', [GameController::class, 'home'])->name('home');

Route::get('/play', [GameController::class, 'play'])->name('play');

Route::get('/highscores', [ScoreController::class, 'page'])->name('highscores');

// High scores as data, for the game. Open to guests; a logged-in player's scores are tied to their account.
Route::get('/api/scores', [ScoreController::class, 'index'])->name('scores.index');
Route::post('/api/scores', [ScoreController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('scores.store');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/avatar', [AvatarController::class, 'store'])->name('profile.avatar.store');
    Route::delete('/profile/avatar', [AvatarController::class, 'destroy'])->name('profile.avatar.destroy');
});

require __DIR__.'/auth.php';
