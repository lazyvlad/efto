<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\Score;
use App\Support\LootTable;
use Illuminate\View\View;

/**
 * A game on the high scores, for anyone to see: who played it and for which side, in what
 * gear, and how each boss went down. Only games with a score on the leaderboard are shown.
 */
class PublicGameController extends Controller
{
    public function show(Game $game): View
    {
        $score = Score::where('game_id', $game->id)->first();
        abort_if($score === null, 404);

        $game->load(['user', 'pickups', 'bossDrops' => fn ($drops) => $drops->orderBy('dropped_at')]);

        return view('games.show', [
            'game' => $game,
            'score' => $score,
            'rank' => Score::rankOf($score->score, $game->version_rank),
            'catalog' => LootTable::rareCatalog(),
        ]);
    }
}
