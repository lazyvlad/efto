<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\AvatarController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GameHistoryController;
use App\Http\Controllers\GameRecordController;
use App\Http\Controllers\ItemController;
use App\Http\Controllers\NewsController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ScoreController;
use Illuminate\Support\Facades\Route;

// The landing page is the site header around the game; /play is the game on its own
Route::get('/', [GameController::class, 'home'])->name('home');

Route::get('/play', [GameController::class, 'play'])->name('play');

Route::get('/highscores', [ScoreController::class, 'page'])->name('highscores');

// Who is behind the game
Route::view('/about', 'about')->name('about');

// Every item in the game and what it pays in coins
Route::get('/items', [ItemController::class, 'index'])->name('items');

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
Route::post('/api/games/{game}/bosses', [GameRecordController::class, 'boss'])
    ->middleware('throttle:20,1')
    ->name('games.boss');
Route::post('/api/games/{game}/finish', [GameRecordController::class, 'finish'])
    ->middleware('throttle:20,1')
    ->name('games.finish');

Route::middleware('auth')->group(function () {
    Route::get('/my-games', [GameHistoryController::class, 'index'])->name('games.history');
    // The same collection as data, for the game's loot screen
    Route::get('/api/collection', [GameHistoryController::class, 'collection'])->name('collection');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::post('/profile/avatar', [AvatarController::class, 'store'])->name('profile.avatar.store');
    Route::delete('/profile/avatar', [AvatarController::class, 'destroy'])->name('profile.avatar.destroy');
});

// The admin section: for accounts made admins with "php artisan input:admin <email>"
Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');

    Route::get('/users', [Admin\UserController::class, 'index'])->name('users.index');
    Route::get('/users/{user}', [Admin\UserController::class, 'show'])->name('users.show');
    Route::post('/users/{user}/activate', [Admin\UserController::class, 'activate'])->name('users.activate');
    Route::post('/users/{user}/coins', [Admin\UserController::class, 'coins'])->name('users.coins');
    Route::post('/users/{user}/block', [Admin\UserController::class, 'block'])->name('users.block');
    Route::post('/users/{user}/unblock', [Admin\UserController::class, 'unblock'])->name('users.unblock');
    Route::post('/users/{user}/admin', [Admin\UserController::class, 'admin'])->name('users.admin');
    // Opening content for a player without their having earned it (App\Support\Grants)
    Route::post('/users/{user}/zones', [Admin\UserController::class, 'zones'])->name('users.zones');
    Route::post('/users/{user}/zones/lock', [Admin\UserController::class, 'lockZones'])->name('users.zones.lock');
    Route::post('/users/{user}/quiver', [Admin\UserController::class, 'quiver'])->name('users.quiver');
    Route::post('/users/{user}/set', [Admin\UserController::class, 'set'])->name('users.set');
    Route::post('/users/{user}/unlock-all', [Admin\UserController::class, 'unlockAll'])->name('users.unlock-all');
    Route::delete('/users/{user}', [Admin\UserController::class, 'destroy'])->name('users.destroy');

    Route::get('/games', [Admin\GameController::class, 'index'])->name('games.index');
    Route::delete('/scores/{score}', [Admin\GameController::class, 'removeScore'])->name('scores.destroy');

    Route::get('/announcements', [Admin\AnnouncementController::class, 'index'])->name('announcements.index');
    Route::post('/announcements', [Admin\AnnouncementController::class, 'send'])->name('announcements.send');

    Route::get('/settings', [Admin\SettingsController::class, 'edit'])->name('settings.edit');
    Route::post('/settings', [Admin\SettingsController::class, 'update'])->name('settings.update');
    Route::post('/settings/reset', [Admin\SettingsController::class, 'reset'])->name('settings.reset');
});

require __DIR__.'/auth.php';

// The link at the foot of every general email: stops them for that player. Signed, so it
// works without logging in and only for the player it was sent to.
Route::get('/news/unsubscribe/{user}', [NewsController::class, 'unsubscribe'])
    ->middleware('signed')
    ->name('news.unsubscribe');

// Development only: see the emails in the browser as they will be sent
if (app()->environment('local')) {
    Route::get('/mail-preview/{email?}', [NewsController::class, 'preview'])->name('mail.preview');
}
