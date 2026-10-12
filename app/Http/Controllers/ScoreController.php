<?php

namespace App\Http\Controllers;

use App\Models\Score;
use App\Support\GuestName;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ScoreController extends Controller
{
    /**
     * The high scores page.
     */
    public function page(): View
    {
        return view('highscores', [
            'scores' => Score::top()->with('user')->get(),
        ]);
    }

    public function index(): JsonResponse
    {
        return response()->json(Score::leaderboard());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'score' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'level' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'gameTime' => ['nullable', 'numeric', 'min:0', 'max:86400'],
            'dragonstalkerCompletions' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'finalCritRating' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'finalDodgeRating' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        // Logged-in players always score under their account name. Guests use the name they
        // typed, or the random guest name they were given for this session.
        $user = $request->user();
        $name = $user
            ? Score::cleanName($user->name)
            : (Score::cleanName($data['name'] ?? '') ?: GuestName::forSession($request));

        Score::create([
            'user_id' => $user?->id,
            'name' => $name ?: 'Anonymous',
            'score' => (int) round($data['score']),
            'level' => (int) round($data['level'] ?? 1),
            'game_time' => (int) round($data['gameTime'] ?? 0),
            'dragonstalker_completions' => (int) round($data['dragonstalkerCompletions'] ?? 0),
            'final_crit_rating' => round($data['finalCritRating'] ?? 0, 1),
            'final_dodge_rating' => round($data['finalDodgeRating'] ?? 0, 1),
        ]);

        return response()->json([
            'success' => true,
            'scores' => Score::leaderboard(),
            'message' => 'Score added successfully',
        ]);
    }
}
