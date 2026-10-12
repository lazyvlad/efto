<?php

use App\Http\Controllers\AvatarController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GameHistoryController;
use App\Http\Controllers\GameRecordController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

// The landing page is the site header around the game; /play is the game on its own
Route::get('/', [GameController::class, 'home'])->name('home');

Route::get('/play', [GameController::class, 'play'])->name('play');

Route::get('/highscores', [ScoreController::class, 'page'])->name('highscores');

// High scores as data, for the game
Route::get('/api/scores', [ScoreController::class, 'index'])->name('scores.index');

// Every game played is recorded: opened when it starts, handed its rare loot a chunk of play
// at a time, closed when it ends. Open to guests; a logged-in player's games are tied to
// their account. A finished game is what puts a score on the leaderboard.
Route::post('/api/games', [GameRecordController::class, 'open'])
    ->middleware('throttle:20,1')
    ->name('games.open');
Route::post('/api/games/{game}/drops', [GameRecordController::class, 'drops'])
    ->middleware('throttle:30,1')
    ->name('games.drops');
Route::post('/api/games/{game}/finish', [GameRecordController::class, 'finish'])
    ->middleware('throttle:20,1')
    ->name('games.finish');

Route::middleware('auth')->group(function () {
    Route::get('/my-games', [GameHistoryController::class, 'index'])->name('games.history');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/avatar', [AvatarController::class, 'store'])->name('profile.avatar.store');
    Route::delete('/profile/avatar', [AvatarController::class, 'destroy'])->name('profile.avatar.destroy');
});

require __DIR__.'/auth.php';
