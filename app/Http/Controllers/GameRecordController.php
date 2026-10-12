<?php

namespace App\Http\Controllers;

use App\Models\Game;
use App\Models\GameDrop;
use App\Models\Score;
use App\Support\GuestName;
use App\Support\LootTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Records every game played and hands each one its rare loot (see config/loot.php).
 *
 * The game opens a record when it starts, asks for its drops a chunk of play at a time and
 * closes the record when it ends. A game that loses the server carries on with its own
 * random loot and is recorded as offline, which keeps it off the leaderboard.
 */
class GameRecordController extends Controller
{
    /**
     * A game is starting.
     */
    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:60'],
            'version' => ['nullable', 'string', 'max:20'],
        ]);

        // Logged-in players always play under their account name. Guests use the name they
        // typed, or the random guest name they were given for this session.
        $user = $request->user();
        $name = $user
            ? Score::cleanName($user->name)
            : (Score::cleanName($data['name'] ?? '') ?: GuestName::forSession($request));

        $game = Game::create([
            'token' => Str::random(40),
            'user_id' => $user?->id,
            'name' => $name ?: 'Anonymous',
            'game_version' => $data['version'] ?? null,
            'started_at' => now(),
        ]);

        return response()->json([
            'game' => $game->token,
            'chunkSeconds' => (int) config('loot.chunk_seconds'),
            'drops' => $this->dropsPayload($game, 0),
        ]);
    }

    /**
     * The rare drops for the next chunk of play. Also reports the pickups made so far.
     */
    public function drops(Request $request, Game $game): JsonResponse
    {
        $data = $request->validate([
            'chunk' => ['required', 'integer', 'min:0', 'max:5000'],
            'pickups' => ['nullable', 'array', 'max:500'],
            'pickups.*' => ['integer'],
        ]);

        abort_unless($game->isOpen(), 409, 'This game is over.');

        $game->claim($data['pickups'] ?? []);

        $chunk = (int) $data['chunk'];
        abort_if($chunk > $game->chunks_issued, 422, 'Chunks are handed out in order.');

        // A chunk is not revealed before the game can have reached it
        $opensAt = $chunk * config('loot.chunk_seconds') - config('loot.early_seconds');
        abort_if($game->secondsSinceStart() < $opensAt, 425, 'Too early for this chunk.');

        return response()->json(['drops' => $this->dropsPayload($game, $chunk)]);
    }

    /**
     * The game is over (or was left mid-game and is being handed in afterwards).
     */
    public function finish(Request $request, Game $game): JsonResponse
    {
        $data = $request->validate([
            'score' => ['required', 'numeric', 'min:0', 'max:10000000'],
            'level' => ['nullable', 'numeric', 'min:0', 'max:999'],
            'gameTime' => ['nullable', 'numeric', 'min:0', 'max:86400'],
            'dragonstalkerCompletions' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'finalCritRating' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'finalDodgeRating' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'pickups' => ['nullable', 'array', 'max:500'],
            'pickups.*' => ['integer'],
            'items' => ['nullable', 'array', 'max:200'],
            'items.*' => ['integer', 'min:0', 'max:100000'],
            'offline' => ['nullable', 'boolean'],
            'abandoned' => ['nullable', 'boolean'],
        ]);

        // Handing the same game in twice changes nothing
        if ($game->isOpen()) {
            $this->close($game, $data);
        }

        $entry = $game->scoreEntry;

        return response()->json([
            'success' => true,
            'legal' => $game->isLegal(),
            'rank' => $entry ? Score::query()->where('score', '>', $entry->score)->count() + 1 : null,
            'scores' => Score::leaderboard(),
        ]);
    }

    private function close(Game $game, array $data): void
    {
        $game->claim($data['pickups'] ?? []);

        // Play time cannot be longer than the time since the game started
        $gameTime = min((int) round($data['gameTime'] ?? 0), $game->secondsSinceStart());

        // Playing on past the chunks that were handed out means the game ran without the server
        $offline = ($data['offline'] ?? false)
            || $gameTime > $game->chunks_issued * config('loot.chunk_seconds');

        $known = LootTable::itemIds();
        $items = array_filter(
            $data['items'] ?? [],
            fn ($count, $itemId) => $count > 0 && in_array((string) $itemId, $known, true),
            ARRAY_FILTER_USE_BOTH
        );

        $game->update([
            'status' => ($data['abandoned'] ?? false) ? Game::ABANDONED : Game::FINISHED,
            'offline' => $offline,
            'score' => (int) round($data['score']),
            'level' => (int) round($data['level'] ?? 1),
            'game_time' => $gameTime,
            'dragonstalker_completions' => (int) round($data['dragonstalkerCompletions'] ?? 0),
            'final_crit_rating' => round($data['finalCritRating'] ?? 0, 1),
            'final_dodge_rating' => round($data['finalDodgeRating'] ?? 0, 1),
            'items' => $items,
            'ended_at' => now(),
        ]);

        // Only games that count go on the leaderboard
        if ($game->isLegal()) {
            Score::create([
                'game_id' => $game->id,
                'user_id' => $game->user_id,
                'name' => $game->name,
                'score' => $game->score,
                'level' => $game->level,
                'game_time' => $game->game_time,
                'dragonstalker_completions' => $game->dragonstalker_completions,
                'final_crit_rating' => $game->final_crit_rating,
                'final_dodge_rating' => $game->final_dodge_rating,
            ]);
        }
    }

    private function dropsPayload(Game $game, int $chunk): array
    {
        return $game->dropsForChunk($chunk)
            ->map(fn (GameDrop $drop) => $drop->forGame())
            ->values()
            ->all();
    }
}
