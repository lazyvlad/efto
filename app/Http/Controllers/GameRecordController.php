<?php

namespace App\Http\Controllers;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\GameDrop;
use App\Models\Score;
use App\Models\User;
use App\Support\Bags;
use App\Support\Gear;
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
        // A guest's account plays under the name he typed, kept for next time; and it has been
        // played, so it is kept a week from now (App\Support\GuestHunter)
        if ($user?->is_guest) {
            $typed = Score::cleanName($data['name'] ?? '');
            $user->forceFill(['name' => $typed ?: $user->name, 'updated_at' => now()])->save();
        }
        $name = $user
            ? Score::cleanName($user->name)
            : (Score::cleanName($data['name'] ?? '') ?: GuestName::forSession($request));

        // Boss Rush is for logged-in players and is paid for; it always starts with the first boss
        $mode = $data['mode'] ?? Game::NORMAL;
        if ($mode === Game::BOSS_RUSH) {
            abort_unless($user && isset($data['faction']), 422, 'Log in to play Boss Rush.');
            abort_unless($user->canUseRewards(), 422, $user->is_guest ? 'Sign up to spend coins.' : 'Activate your account to spend coins.');
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
            abort_unless($user->canUseRewards(), 422, $user->is_guest ? 'Sign up to spend coins.' : 'Activate your account to spend coins.');
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
        // Being played from now on (Live games)
        $game->forceFill(['last_seen_at' => now()])->save();

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
            // How the game is going, for Live games (shown, never relied on)
            'progress' => ['nullable', 'array'],
            'progress.score' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'progress.level' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'progress.boss' => ['nullable', 'string', 'max:40'],
            'progress.bossHealth' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ]);

        abort_unless($game->isOpen(), 409, 'This game is over.');

        $game->claim($data['pickups'] ?? []);
        $this->seen($game, $data['progress'] ?? null);

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
            // How the fight went, for the player's record (shown, never relied on)
            'fight' => ['sometimes', 'array'],
            'fight.seconds' => ['required_with:fight', 'numeric', 'min:0', 'max:3600'],
            'fight.points' => ['required_with:fight', 'integer', 'min:0', 'max:1000000'],
            'fight.speedPoints' => ['required_with:fight', 'integer', 'min:0', 'max:1000000'],
            'fight.par' => ['required_with:fight', 'integer', 'min:0', 'max:3600'],
            'fight.arrows' => ['required_with:fight', 'integer', 'min:0', 'max:100000'],
            'fight.damage' => ['required_with:fight', 'integer', 'min:0', 'max:1000000'],
            'fight.hits' => ['required_with:fight', 'integer', 'min:0', 'max:60000'],
        ]);

        abort_unless($game->isOpen(), 409, 'This game is over.');

        $boss = BossLoot::boss($data['boss']);
        // Heard from, and no longer fighting it (Live games)
        $game->forceFill([
            'last_seen_at' => now(),
            'live' => $game->live ? ['boss' => null, 'bossHealth' => null] + $game->live : null,
        ])->save();
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
        $bindings = [];

        if (! $drop) {
            $item = BossLoot::roll($boss);
            $quiver = BossLoot::rollQuiver($game->user, $boss['faction'], $boss['zone']);
            $setPiece = BossLoot::rollSetPiece($game->user, $boss);
            $bag = BossLoot::rollBag($game->user, $boss);

            try {
                $drop = $game->bossDrops()->create([
                    'user_id' => $game->user_id,
                    'boss_id' => $boss['id'],
                    'item_id' => $item['id'],
                    'rarity' => $item['rarity'],
                    'quiver' => $quiver,
                    'set_piece' => $setPiece,
                    'bag' => $bag,
                    'dropped_at' => now(),
                ] + $this->fightRecord($data['fight'] ?? null));

                if ($quiver) {
                    $game->user->forceFill(['quiver' => true])->save();
                }
                // His now: it goes with him, while there is room in his 36
                if ($game->user) {
                    Gear::carryCaught($game->user, $boss['faction'], array_filter([$item['id'], $setPiece]));
                }
                // A bag goes on at once
                if ($bag !== null) {
                    Bags::putOn($game->user, $bag);
                }

                // A Binding of the Windseeker, now and then, into his bank
                $bindings = BossLoot::rollBindings($game->user, $boss);
                if ($bindings) {
                    Bags::deposit($game->user->fresh(), $boss['faction'], array_fill_keys($bindings, 1));
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
            // A piece of the zone's hunter set came with it
            'setPiece' => $drop->set_piece ? [
                'id' => $drop->set_piece,
                'name' => LootTable::catalog()[$drop->set_piece]['name'] ?? $drop->set_piece,
                'set' => LootTable::setOf($drop->set_piece)['id'] ?? null,
            ] : null,
            // A bag came with it, and is on: its size, and the bags after
            'bag' => $drop->bag ? ['size' => $drop->bag, 'bags' => $game->user?->fresh()->bags ?? []] : null,
            // A Binding of the Windseeker came with it, into his bank (the first report only)
            'bindings' => array_map(fn ($id) => ['id' => $id, 'name' => config("crafting.items.$id.name")], $bindings),
            'timesFound' => $drop->user_id !== null
                ? BossDrop::where('user_id', $drop->user_id)->where('item_id', $drop->item_id)->count()
                : null,
            // The furthest zone the player may now start a game in on this side
            'unlockedZone' => $game->user ? BossLoot::unlockedZone($game->user, $boss['faction']) : null,
        ]);
    }

    /**
     * The columns of a boss kill's fight record, from what the game reported (or none).
     *
     * @return array<string, int|float>
     */
    private function fightRecord(?array $fight): array
    {
        if ($fight === null) {
            return [];
        }

        return [
            'fight_seconds' => round((float) $fight['seconds'], 1),
            'points' => (int) $fight['points'],
            'speed_points' => (int) $fight['speedPoints'],
            'par_seconds' => (int) $fight['par'],
            'arrows_used' => (int) $fight['arrows'],
            'damage_taken' => (int) $fight['damage'],
            'hits_taken' => (int) $fight['hits'],
        ];
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
            // How much of each thing caught did not fit in the bags
            'overflow' => ['nullable', 'array', 'max:200'],
            'overflow.*' => ['integer', 'min:0', 'max:100000'],
            // What was drunk from the bags in the game (potions: config/crafting.php)
            'used' => ['nullable', 'array', 'max:20'],
            'used.*' => ['integer', 'min:0', 'max:10000'],
            // What the game put in the bags: potions caught at full health or while time was
            // slowed, arrows that did not fit in the quiver
            'stored' => ['nullable', 'array', 'max:20'],
            'stored.*' => ['integer', 'min:0', 'max:100000'],
            // The strongest set worn in the game and what it gave
            'gear' => ['nullable', 'array'],
            'gear.set' => ['required_with:gear', 'string', 'in:'.implode(',', array_keys(config('loot.sets')))],
            'gear.pieces' => ['required_with:gear', 'integer', 'min:0', 'max:20'],
            'gear.health' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'gear.armor' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'gear.attackPower' => ['nullable', 'integer', 'min:0', 'max:10000'],
            // A boss fight the game ended in, lost or left (shown, never relied on)
            'bossFight' => ['nullable', 'array'],
            'bossFight.boss' => ['required_with:bossFight', 'string', 'max:40'],
            'bossFight.seconds' => ['required_with:bossFight', 'numeric', 'min:0', 'max:3600'],
            'bossFight.bossHealth' => ['required_with:bossFight', 'numeric', 'min:0', 'max:1'],
            'bossFight.arrows' => ['required_with:bossFight', 'integer', 'min:0', 'max:100000'],
            'bossFight.damage' => ['required_with:bossFight', 'integer', 'min:0', 'max:1000000'],
            'bossFight.hits' => ['required_with:bossFight', 'integer', 'min:0', 'max:60000'],
        ]);

        // Handing the same game in twice changes nothing
        if ($game->isOpen()) {
            DB::transaction(fn () => $this->close($game, $data));
            DiscordFeed::gamePlayed($game);
        }

        $entry = $game->scoreEntry;
        // The balance is only for the player whose game this is
        // Read afresh: the game has just paid into the purse and the bank
        $owner = $game->user_id !== null && $game->user_id === $request->user()?->id ? $game->user()->first() : null;

        return response()->json([
            'success' => true,
            'legal' => $game->isLegal(),
            'mode' => $game->mode,
            'rank' => $entry ? Score::rankOf($entry->score, $game->version_rank) : null,
            'coins' => ['earned' => $game->coins, 'balance' => $owner?->coins],
            // The crafting materials this game brought back, what is in the bank, and what is in
            // the bags now
            'materials' => ['kept' => (object) ($game->materials ?? []), 'bank' => $owner ? (object) Bags::bank($owner, $game->faction ?: 'alliance') : null],
            'bags' => $owner ? (object) Bags::contents($owner, $game->faction ?: 'alliance') : null,
            'scores' => Score::leaderboard(),
        ]);
    }

    /**
     * The boss fight a game ended in, if it is one of its side's bosses and not one that went
     * down in it.
     */
    private function lastFight(Game $game, ?array $fight): ?array
    {
        $boss = $fight ? BossLoot::boss($fight['boss']) : null;
        if ($boss === null || ($game->faction !== null && $boss['faction'] !== $game->faction)
            || $game->bossDrops()->where('boss_id', $boss['id'])->exists()) {
            return null;
        }

        return [
            'boss' => $boss['id'],
            'seconds' => round((float) $fight['seconds'], 1),
            'bossHealth' => round((float) $fight['bossHealth'], 3),
            'arrows' => (int) $fight['arrows'],
            'damage' => (int) $fight['damage'],
            'hits' => (int) $fight['hits'],
        ];
    }

    /**
     * The game was heard from: it is being played, and this is how it is going.
     */
    private function seen(Game $game, ?array $progress): void
    {
        $boss = isset($progress['boss']) ? BossLoot::boss($progress['boss']) : null;

        $game->forceFill([
            'last_seen_at' => now(),
            'live' => $progress === null ? $game->live : [
                'score' => (int) ($progress['score'] ?? 0),
                'level' => (int) ($progress['level'] ?? 0),
                'boss' => $boss['id'] ?? null,
                'bossHealth' => $boss ? round((float) ($progress['bossHealth'] ?? 1), 3) : null,
            ],
        ])->save();
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
            'gear' => $this->gear($data['gear'] ?? null),
            'last_fight' => $this->lastFight($game, $data['bossFight'] ?? null),
            'ended_at' => now(),
        ]);

        // Every recorded game earns its coins, finished or not: what was caught was caught
        // What was only worth selling is sold; the crafting materials stay in the bags, and
        // what was drunk from them is gone. What did not fit in the bags was sold short, a
        // material with it (App\Support\Bags).
        $settled = Bags::settle($game, $items, $data['overflow'] ?? []);
        $coins = $settled['coins'];
        $game->update(['coins' => $coins, 'materials' => $settled['materials'] ?: null]);
        if ($game->user_id !== null) {
            if ($coins > 0) {
                $game->user()->increment('coins', $coins);
            }
            $kept = fn ($list) => array_filter($list ?? [], fn ($count, $itemId) => Bags::keepable((string) $itemId), ARRAY_FILTER_USE_BOTH);
            $stored = array_intersect_key($kept($data['stored'] ?? []), config('crafting.stored_per_minute', []));
            Bags::afterGame($game->user()->first(), $game->faction ?: 'alliance', $settled['materials'], $kept($data['used'] ?? []), $stored, (int) $game->game_time);
            // The gear he caught goes with him, while there is room in his 36
            Gear::carryCaught($game->user()->first(), $game->faction ?: 'alliance', $game->pickups()->pluck('item_id')->all());
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

    /**
     * The gear a game was played in, as it is kept: the set, how many of its pieces (never
     * more than it has), and what they gave. Nothing when no piece was worn.
     */
    private function gear(?array $gear): ?array
    {
        $pieces = count(config('loot.sets.'.($gear['set'] ?? '').'.pieces', []));
        $worn = min($pieces, (int) ($gear['pieces'] ?? 0));

        if ($worn < 1) {
            return null;
        }

        return [
            'set' => $gear['set'],
            'pieces' => $worn,
            'health' => (int) ($gear['health'] ?? 0),
            'armor' => (int) ($gear['armor'] ?? 0),
            'attackPower' => (int) ($gear['attackPower'] ?? 0),
        ];
    }

    private function dropsPayload(Game $game, int $chunk): array
    {
        return $game->dropsForChunk($chunk)
            ->map(fn (GameDrop $drop) => $drop->forGame())
            ->values()
            ->all();
    }
}
