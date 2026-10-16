<?php

namespace App\Support;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * A guest's hunters, kept on an account of their own (users.is_guest) with no email or
 * password. The guest's browser holds its key in a cookie, which only the game's page and
 * its requests look at (App\Http\Middleware\ResolveGuestHunter): for the rest of the site a
 * guest is a visitor. What a guest finds is his for as long as his browser keeps the key and
 * he comes back within a week, and it all comes along when he signs up (adopt) or logs in to
 * an account he has (mergeInto). He earns coins, but spends them only once he has an account
 * he can use (User::canUseRewards).
 */
class GuestHunter
{
    public const COOKIE = 'input_guest';

    /** Days a guest may stay away before his hunters are let go */
    public const DAYS = 7;

    /** The guest whose key this request carries, if it is still kept */
    public static function fromRequest(Request $request): ?User
    {
        $key = $request->cookie(self::COOKIE);
        if (! is_string($key) || strlen($key) < 32) {
            return null;
        }

        return User::where('is_guest', true)->where('guest_key', hash('sha256', $key))->first();
    }

    /**
     * A new guest, under the name he was given for this session. The key goes to his browser
     * with the response.
     */
    public static function create(Request $request): User
    {
        $key = Str::random(64);
        $guest = new User;
        $guest->forceFill([
            'name' => GuestName::forSession($request),
            'is_guest' => true,
            'guest_key' => hash('sha256', $key),
        ])->save();

        Cookie::queue(self::COOKIE, $key, 60 * 24 * 365);

        // Now and then, let go of the guests who have not been back
        if (random_int(1, 50) === 1) {
            self::prune();
        }

        return $guest;
    }

    /** The browser forgets the key */
    public static function forgetCookie(): void
    {
        Cookie::queue(Cookie::forget(self::COOKIE));
    }

    /**
     * What a guest has, for the welcome back and for bringing it to an account. Null for a
     * guest who has played no game yet.
     *
     * @return array{since: string, coins: int, hunters: array<string, array{games: int, bosses: int, gear: int, pieces: int, materials: int}>}|null
     */
    public static function summary(User $guest): ?array
    {
        $first = Game::where('user_id', $guest->id)->orderBy('created_at')->first();
        if ($first === null) {
            return null;
        }

        $hunters = [];
        foreach (Gear::SIDES as $side) {
            $games = Gear::onSide(Game::where('user_id', $guest->id), $side)->count();
            if ($games === 0) {
                continue;
            }
            $gear = array_filter(Gear::owned($guest, $side), fn ($count, $itemId) => ! Gear::isStarter($itemId), ARRAY_FILTER_USE_BOTH);
            $kept = array_sum(Bags::contents($guest, $side)) + array_sum(Bags::bank($guest, $side));
            $hunters[$side] = [
                'games' => $games,
                'bosses' => $guest->bossDrops()->get(['boss_id'])
                    ->filter(fn (BossDrop $drop) => (BossLoot::boss($drop->boss_id)['faction'] ?? null) === $side)
                    ->pluck('boss_id')->unique()->count(),
                'gear' => array_sum($gear),
                'pieces' => count($guest->setPieces($side)),
                'materials' => $kept,
            ];
        }

        return [
            'since' => $first->created_at->toIso8601String(),
            'coins' => (int) $guest->coins,
            'hunters' => $hunters,
        ];
    }

    /**
     * A guest signs up: his account becomes a real one, with all he found. The games he played
     * and the scores he set are shown under his account's name from now on, not the one he
     * played under as a guest.
     */
    public static function adopt(User $guest, string $name, string $email, string $password): User
    {
        DB::transaction(function () use ($guest, $name, $email, $password) {
            $guest->forceFill([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'is_guest' => false,
                'guest_key' => null,
            ])->save();
            Game::where('user_id', $guest->id)->update(['name' => $name]);
            \App\Models\Score::where('user_id', $guest->id)->update(['name' => $name]);
        });

        return $guest;
    }

    /**
     * A guest logs in to an account he has and brings along what he found: each hunter's to
     * the same hunter. His games and boss loot become the account's, what he kept in his bags
     * and bank goes to the bank, his coins to the purse. What the account wears and carries is
     * left as it is: the guest's gear waits in the bank. His games and scores are shown under
     * the account's name.
     */
    public static function mergeInto(User $guest, User $user): void
    {
        DB::transaction(function () use ($guest, $user) {
            Game::where('user_id', $guest->id)->update(['user_id' => $user->id, 'name' => $user->name]);
            BossDrop::where('user_id', $guest->id)->update(['user_id' => $user->id]);
            \App\Models\Score::where('user_id', $guest->id)->update(['user_id' => $user->id, 'name' => $user->name]);

            $bank = [];
            $sold = [];
            foreach (Gear::SIDES as $side) {
                $bank[$side] = self::plus(
                    self::plus(Bags::bank($user, $side), Bags::bank($guest, $side)),
                    Bags::contents($guest, $side)
                );
                $sold[$side] = self::plus(Gear::sold($user, $side), Gear::sold($guest, $side));
            }

            $ledger = Gear::ledger($user);
            foreach (Gear::ledger($guest) as $kind => $sides) {
                foreach ($sides as $side => $counts) {
                    $ledger[$kind][$side] = self::plus($ledger[$kind][$side], $counts);
                }
            }
            foreach ($ledger as $kind => $sides) {
                foreach ($sides as $side => $counts) {
                    $ledger[$kind][$side] = (object) $counts;
                }
            }

            // The biggest bags of both, as many as there are bag slots
            $bags = array_merge($user->bags ?? [], $guest->bags ?? []);
            rsort($bags);
            $bags = array_slice($bags, 0, (int) config('loot.bags.bag_slots'));

            $user->forceFill([
                'coins' => (int) $user->coins + (int) $guest->coins,
                'quiver' => $user->quiver || $guest->quiver,
                'materials' => array_map(fn ($counts) => (object) $counts, $bank),
                'bag_contents' => array_map(fn ($counts) => (object) $counts, [
                    'alliance' => Bags::contents($user, 'alliance'),
                    'horde' => Bags::contents($user, 'horde'),
                ]),
                'sold' => array_map(fn ($counts) => (object) $counts, $sold),
                'gear_ledger' => $ledger,
                'bags' => $bags,
            ])->save();

            $guest->delete();
        });
    }

    /**
     * Let go of the guests who have not played for a week, and of those who never played at
     * all after a day. Their games stay on the leaderboard under the name they played as.
     */
    public static function prune(): int
    {
        $idle = User::where('is_guest', true)
            ->where('updated_at', '<', now()->subDays(self::DAYS))
            ->whereDoesntHave('games', fn ($games) => $games->where('created_at', '>=', now()->subDays(self::DAYS)))
            ->pluck('id');
        $neverPlayed = User::where('is_guest', true)
            ->where('created_at', '<', now()->subDay())
            ->whereDoesntHave('games')
            ->pluck('id');

        return User::whereIn('id', $idle->merge($neverPlayed)->unique())->delete();
    }

    /** @return array<string, int> */
    private static function plus(array $a, array $b): array
    {
        foreach ($b as $itemId => $count) {
            $a[$itemId] = ($a[$itemId] ?? 0) + (int) $count;
        }

        return array_filter($a, fn ($count) => $count > 0);
    }
}
