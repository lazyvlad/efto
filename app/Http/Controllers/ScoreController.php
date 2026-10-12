<?php

namespace App\Http\Controllers;

use App\Models\Score;
use Illuminate\Http\JsonResponse;
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
}
