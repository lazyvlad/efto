<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\Score;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Every game played, newest first, and the leaderboard kept honest.
 */
class GameController extends Controller
{
    public function index(Request $request): View
    {
        $search = trim((string) $request->query('q'));
        $show = $request->query('show');

        $games = Game::query()
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%"))
            ->when($show === 'leaderboard', fn ($q) => $q->whereHas('scoreEntry'))
            ->when($show === 'offline', fn ($q) => $q->where('offline', true))
            ->when($show === 'guests', fn ($q) => $q->whereNull('user_id'))
            ->when($show === 'rush', fn ($q) => $q->where('mode', Game::BOSS_RUSH))
            ->with(['user', 'scoreEntry'])
            ->withCount('bossDrops')
            ->latest('started_at')
            ->paginate(30)
            ->withQueryString();

        return view('admin.games.index', ['games' => $games, 'search' => $search, 'show' => $show]);
    }

    /**
     * Take a score off the leaderboard. The game itself stays on record.
     */
    public function removeScore(Score $score): RedirectResponse
    {
        $score->delete();

        return back()->with('status', __('The score of :name (:score) is off the leaderboard.', [
            'name' => $score->name,
            'score' => number_format($score->score),
        ]));
    }
}
