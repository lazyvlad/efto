<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BossDrop;
use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use Illuminate\View\View;

/**
 * The admin section's front page: how the game is doing at a glance.
 */
class DashboardController extends Controller
{
    public function __invoke(): View
    {
        $played = fn () => Game::query()->where('status', '!=', Game::OPEN);

        return view('admin.dashboard', [
            'accounts' => [
                'all' => User::count(),
                'activated' => User::where(fn ($q) => $q->whereNotNull('email_verified_at')->orWhereNotNull('discord_id'))->count(),
                'discord' => User::whereNotNull('discord_id')->count(),
                'blocked' => User::whereNotNull('blocked_at')->count(),
                'week' => User::where('created_at', '>=', now()->subDays(7))->count(),
            ],
            'games' => [
                'all' => $played()->count(),
                'today' => $played()->where('started_at', '>=', now()->startOfDay())->count(),
                'week' => $played()->where('started_at', '>=', now()->subDays(7))->count(),
                'guests' => $played()->whereNull('user_id')->count(),
                'open' => Game::where('status', Game::OPEN)->where('started_at', '>=', now()->subHour())->count(),
            ],
            'coins' => (int) User::sum('coins'),
            'bossesDown' => BossDrop::count(),
            'scores' => Score::count(),
            'newest' => User::latest()->limit(8)->get(),
            'recent' => $played()->with('user')->withCount('bossDrops')->latest('started_at')->limit(10)->get(),
        ]);
    }
}
