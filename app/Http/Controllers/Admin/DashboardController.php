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
                'all' => User::where('is_guest', false)->count(),
                'activated' => User::where('is_guest', false)->where(fn ($q) => $q->whereNotNull('email_verified_at')->orWhereNotNull('discord_id'))->count(),
                'discord' => User::where('is_guest', false)->whereNotNull('discord_id')->count(),
                'blocked' => User::where('is_guest', false)->whereNotNull('blocked_at')->count(),
                'week' => User::where('is_guest', false)->where('created_at', '>=', now()->subDays(7))->count(),
            ],
            'games' => [
                'all' => $played()->count(),
                'today' => $played()->where('started_at', '>=', now()->startOfDay())->count(),
                'week' => $played()->where('started_at', '>=', now()->subDays(7))->count(),
                'guests' => $played()->where(fn ($q) => $q->whereNull('user_id')->orWhereHas('user', fn ($u) => $u->where('is_guest', true)))->count(),
                'open' => Game::where('status', Game::OPEN)->where('started_at', '>=', now()->subHour())->count(),
            ],
            'coins' => (int) User::where('is_guest', false)->sum('coins'),
            'bossesDown' => BossDrop::count(),
            'scores' => Score::count(),
            'newest' => User::where('is_guest', false)->latest()->limit(8)->get(),
            'recent' => $played()->with('user')->withCount('bossDrops')->latest('started_at')->limit(10)->get(),
        ]);
    }
}
