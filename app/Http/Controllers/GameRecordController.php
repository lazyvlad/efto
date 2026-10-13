<?php

namespace App\Http\Controllers;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\GameDrop;
use App\Models\Score;
use App\Models\User;
use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\DiscordFeed;
use App\Support\GuestName;
use App\Support\LootTable;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Records every game played and hands each one its rare loot (see config/loot.php).
 *
 * The game opens a record when it starts, asks for its drops a chunk of play at a time and
 * closes the record when it ends. A game that loses the server carries on with its own
 * random loot and is recorded as offline, which keeps it off the leaderboard.
 *
 * It also decides what a defeated boss drops (config/boss_loot.php) and, when the game is
 * closed, what it earned in coins. Both are kept on a logged-in player's account.
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
            'faction' => ['nullable', 'in:alliance,horde'],
            'version' => ['nullable', 'string', 'max:20'],
            'startZone' => ['nullable', 'integer', 'min:1', 'max:10'],
            'mode' => ['nullable', 'in:normal,boss_rush,boss_fight'],
        ]);

        // Logged-in players always play under their account name. Guests use the name they
        // typed, or the random guest name they were given for this session.
        $user = $request->user();
        $name = $user
            ? Score::cleanName($user->name)
            : (Score::cleanName($data['name'] ?? '') ?: GuestName::forSession($request));

        // Boss Rush is for logged-in players and is paid for; it always starts with the first boss
        $mode = $data['mode'] ?? Game::NORMAL;
        if ($mode === Game::BOSS_RUSH) {
            abort_unless($user && isset($data['faction']), 422, 'Log in to play Boss Rush.');
            abort_unless($user->canUseRewards(), 422, 'Activate your account to spend coins.');
            abort_if((int) ($data['startZone'] ?? 1) > 1, 422, 'Boss Rush starts with the first boss.');

            $fee = (int) config('boss_loot.rush.entry_fee');
            $paid = User::whereKey($user->id)->where('coins', '>=', $fee)->decrement('coins', $fee);
            abort_if($paid === 0, 422, 'Not enough coins.');
        }

        // A boss fight is the boss of the zone the game starts in, alone: only a boss the
        // player has beaten before, in a game played through to it. It is reached, and paid
        // for, as skipping to its zone is (below).
        if ($mode === Game::BOSS_FIGHT) {
            abort_unless($user && isset($data['faction']), 422, 'Log in to fight a boss on its own.');

            $bossId = array_keys(config('boss_loot.bosses.'.$data['faction']))[(int) ($data['startZone'] ?? 1) - 1] ?? null;
            abort_unless(
                $bossId !== null && $user->bossDrops()->where('boss_id', $bossId)->exists(),
                422,
                'Defeat this boss in a game first.'
            );
        }

        // Skipping ahead: only past bosses the player has beaten before, and it costs coins
        $startZone = (int) ($data['startZone'] ?? 1);
        if ($startZone > 1) {
            abort_unless($user && isset($data['faction']), 422, 'Log in to skip ahead.');
            abort_unless($user->canUseRewards(), 422, 'Activate your account to spend coins.');
            abort_if($startZone > BossLoot::unlockedZone($user, $data['faction']), 422, 'Defeat the earlier bosses first.');

            // Only taken if the purse still holds that much
            $cost = BossLoot::skipCost($startZone);
            $paid = User::whereKey($user->id)->where('coins', '>=', $cost)->decrement('coins', $cost);
            abort_if($paid === 0, 422, 'Not enough coins.');
        }

        $game = Game::create([
            'token' => Str::random(40),
            'user_id' => $user?->id,
            'name' => $name ?: 'Anonymous',
            'faction' => $data['faction'] ?? null,
            'start_zone' => $startZone,
            'mode' => $mode,
            'game_version' => $data['version'] ?? null,
            'started_at' => now(),
        ]);

        return response()->json([
            'game' => $game->token,
            'chunkSeconds' => (int) config('loot.chunk_seconds'),
            'drops' => $this->dropsPayload($game, 0),
            // The purse, after paying for any skip
            'coins' => $user ? (int) $user->fresh()->coins : null,
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
     * A boss was defeated: decide what it drops. A logged-in player keeps the item; a guest
     * is only shown it. Reporting the same boss again returns the same item.
     */
    public function boss(Request $request, Game $game): JsonResponse
    {
        $data = $request->validate([
            'boss' => ['required', 'string', 'max:40'],
        ]);

        abort_unless($game->isOpen(), 409, 'This game is over.');

        $boss = BossLoot::boss($data['boss']);
        abort_if($boss === null, 422, 'No such boss.');
        abort_if($game->faction !== null && $game->faction !== $boss['faction'], 422, 'That boss is on the other side.');

        abort_if($boss['zone'] < $game->start_zone, 422, 'This game started past that boss.');

        // A boss fight has the one boss, of the zone it started in
        abort_if($game->isBossFight() && $boss['zone'] !== $game->start_zone, 422, 'This game is a fight with one boss.');

        $earliest = ($boss['zone'] - $game->start_zone + 1) * ($game->isOnlyBosses()
            ? config('boss_loot.rush.min_seconds_per_boss')
            : config('boss_loot.min_seconds_per_zone'));
        abort_if($game->secondsSinceStart() < $earliest, 425, 'Too early for this boss.');

        $drop = $game->bossDrops()->where('boss_id', $boss['id'])->first();

        if (! $drop) {
            $item = BossLoot::roll($boss);
            $quiver = BossLoot::rollQuiver($game->user);

            try {
                $drop = $game->bossDrops()->create([
                    'user_id' => $game->user_id,
                    'boss_id' => $boss['id'],
                    'item_id' => $item['id'],
                    'rarity' => $item['rarity'],
                    'quiver' => $quiver,
                    'dropped_at' => now(),
                ]);

                if ($quiver) {
                    $game->user->forceFill(['quiver' => true])->save();
                }
            } catch (UniqueConstraintViolationException) {
                // The same report arrived twice at once
                $drop = $game->bossDrops()->where('boss_id', $boss['id'])->firstOrFail();
            }
        }

        return response()->json([
            'boss' => $boss['id'],
            'item' => BossLoot::item($boss, $drop->item_id),
            'kept' => $drop->user_id !== null,
            // The large quiver came with it (once in an account's life)
            'quiver' => $drop->quiver ? config('boss_loot.quiver.name') : null,
            'timesFound' => $drop->user_id !== null
                ? BossDrop::where('user_id', $drop->user_id)->where('item_id', $drop->item_id)->count()
                : null,
            // The furthest zone the player may now start a game in on this side
            'unlockedZone' => $game->user ? BossLoot::unlockedZone($game->user, $boss['faction']) : null,
        ]);
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
            DB::transaction(fn () => $this->close($game, $data));
            DiscordFeed::gamePlayed($game);
        }

        $entry = $game->scoreEntry;
        // The balance is only for the player whose game this is
        $owner = $game->user_id !== null && $game->user_id === $request->user()?->id ? $game->user : null;

        return response()->json([
            'success' => true,
            'legal' => $game->isLegal(),
            'mode' => $game->mode,
            'rank' => $entry ? Score::query()->where('score', '>', $entry->score)->count() + 1 : null,
            'coins' => ['earned' => $game->coins, 'balance' => $owner?->coins],
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

        // Every recorded game earns its coins, finished or not: what was caught was caught
        $coins = Coins::earned($game, $items);
        $game->update(['coins' => $coins]);
        if ($coins > 0 && $game->user_id !== null) {
            $game->user()->increment('coins', $coins);
        }

        // Only games that count go on the leaderboard, and Boss Rush and boss fights are not
        // played for points
        if ($game->isLegal() && ! $game->isOnlyBosses()) {
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
