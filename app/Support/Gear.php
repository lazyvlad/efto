<?php

namespace App\Support;

use App\Models\User;

/**
 * What a hunter wears: one item in each slot of the character sheet. The game decides what
 * wearing it gives (game/utils/gear.js); the site keeps what a player has put on and makes
 * sure it is theirs to wear and fits where they put it.
 */
class Gear
{
    /** The slots of the character sheet (SLOTS in game/utils/gear.js). */
    public const SLOTS = [
        'head', 'neck', 'shoulder', 'back', 'chest', 'shirt', 'tabard', 'wrist',
        'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2',
        'mainhand', 'offhand', 'ranged', 'quiver',
    ];

    /**
     * Where the pieces of a hunter set are worn, in the order every set lists its pieces
     * (config/loot.php): head first, the ring, for the set that has one, last.
     */
    private const SET_PIECE_SLOTS = [
        ['head'], ['shoulder'], ['chest'], ['wrist'], ['hands'], ['waist'], ['legs'], ['feet'],
        ['finger1', 'finger2'],
    ];

    /** The game's word for where an item is worn, and the sheet's slots that is (WORN_IN in game/utils/gear.js). */
    private const WORN_IN = [
        'head' => ['head'], 'neck' => ['neck'], 'shoulders' => ['shoulder'], 'back' => ['back'], 'chest' => ['chest'],
        'shirt' => ['shirt'], 'tabard' => ['tabard'], 'bracers' => ['wrist'], 'hands' => ['hands'], 'belt' => ['waist'],
        'legs' => ['legs'], 'boots' => ['feet'], 'ring' => ['finger1', 'finger2'], 'trinket' => ['trinket1', 'trinket2'],
        'mainhand' => ['mainhand'], 'offhand' => ['offhand'], 'ranged' => ['ranged'], 'quiver' => ['quiver'],
    ];

    /** The large quiver as an item: found once by each hunter at most, from his side's bosses */
    public const LARGE_QUIVER = 'ancient-sinew-wrapped-lamina';

    /**
     * The hunters who have found the large quiver: the sides of the bosses that dropped it
     * (boss_drops.quiver). One given before that (users.quiver with no such drop, from the
     * admin) is the Alliance hunter's.
     *
     * @return array<int, string>
     */
    public static function quiverSides(User $user): array
    {
        $sides = $user->bossDrops()->where('quiver', true)->pluck('boss_id')
            ->map(fn ($bossId) => BossLoot::boss($bossId)['faction'] ?? null)
            ->filter()->unique()->values()->all();

        return $sides === [] && $user->quiver ? ['alliance'] : $sides;
    }

    /** The two hunters, each with an outfit of their own */
    public const SIDES = ['alliance', 'horde'];

    /** What kind of thing is worn in a slot, for what it gives ("budget" in config/gear.php). */
    private const KIND = [
        'mainhand' => 'weapon', 'offhand' => 'weapon', 'ranged' => 'weapon',
        'neck' => 'jewelry', 'ring' => 'jewelry', 'trinket' => 'jewelry',
    ];

    /**
     * Everything that can be worn besides the pieces of the hunter sets: what the bosses drop,
     * and the weapons and jewellery that fall in a game. By item id: name, picture, where it
     * is worn (the game's word), rarity, what it gives, what it sells for, and where from.
     *
     * Boss loot and the clothes a hunter starts in are one side's ('side'): the other side's
     * hunter never wears them. The rest is either's.
     *
     * @return array<string, array{name: string, image: string, slot: string, rarity: string, stats: array<string, int>, value: int, from: string, side?: string}>
     */
    public static function catalog(): array
    {
        static $catalog = null;
        if ($catalog !== null && ! app()->runningUnitTests()) {
            return $catalog;
        }

        $catalog = [];
        $slots = config('gear.boss_slots');

        // A boss's loot is its side's: only that side's hunter wears it
        foreach (config('boss_loot.bosses') as $side => $bosses) {
            $zone = 0;
            foreach ($bosses as $boss) {
                $zone++;
                foreach ($boss['loot'] as $rarity => $item) {
                    $slot = $slots[$item['id']] ?? null;
                    if ($slot === null) {
                        continue;
                    }

                    $catalog[$item['id']] = [
                        'name' => $item['name'],
                        // Its own picture, or else its boss's stands for it
                        'image' => self::iconOf($item['id']) ?? $boss['image'],
                        'slot' => $slot,
                        'rarity' => $rarity,
                        'stats' => self::bossItemStats($slot, $rarity, $zone, self::isTwoHanded($item['id'])),
                        'twoHanded' => self::isTwoHanded($item['id']),
                        'value' => (int) config("gear.boss_value_per_zone.$rarity") * $zone,
                        'from' => $boss['name'],
                        'side' => $side,
                        'binding' => 'pickup',
                    ];
                }
            }
        }

        $items = LootTable::catalog();
        foreach (config('gear.drops') as $itemId => $drop) {
            $type = LootTable::typeOf($itemId);
            $catalog[$itemId] = [
                'name' => $items[$itemId]['name'],
                'image' => $items[$itemId]['image'],
                'slot' => $drop['slot'],
                'rarity' => $drop['rarity'] ?? 'epic',
                'stats' => $drop['stats'],
                'twoHanded' => self::isTwoHanded($itemId),
                'value' => (int) config("loot.coins.$type"),
                'from' => 'Falls in a game',
                'binding' => 'equip',
            ];
        }

        // The large quiver a boss may drop (boss_loot.quiver): worn in the quiver slot, it adds
        // slots to the quiver while it is on (quiverSlots; quiver in game/config/gameConfig.js)
        $catalog[self::LARGE_QUIVER] = [
            'name' => config('boss_loot.quiver.name'),
            'image' => self::iconOf(self::LARGE_QUIVER) ?? 'assets/powerups/thorium-arrows.webp',
            'slot' => 'quiver',
            'rarity' => 'epic',
            'stats' => [],
            'twoHanded' => false,
            'value' => 0,
            'from' => 'A boss, now and then',
            'quiverSlots' => (int) config('boss_loot.quiver.slots', 4),
            'binding' => 'pickup',
        ];

        // The clothes the hunters start in
        foreach (config('gear.starter') as $side => $pieces) {
            foreach ($pieces as $piece) {
                $catalog[$piece['id']] = [
                    'name' => $piece['name'],
                    'image' => self::iconOf($piece['id']) ?? 'assets/items/gear/'.$piece['id'].'.webp',
                    'slot' => $piece['slot'],
                    'rarity' => 'common',
                    'stats' => $piece['stats'],
                    'twoHanded' => false,
                    'value' => 0,
                    'from' => $side === 'alliance' ? 'The Alliance hunter\'s first clothes' : 'The Horde hunter\'s first clothes',
                    'starter' => $side,
                    'side' => $side,
                    'binding' => 'pickup',
                ];
            }
        }

        return $catalog;
    }

    /**
     * The gear that binds when worn, between the hunters: what each sent the other, and what
     * each has bound by wearing it (users.gear_ledger).
     *
     * @return array{sent: array<string, array<string, int>>, bound: array<string, array<string, int>>}
     */
    public static function ledger(User $user): array
    {
        $saved = $user->gear_ledger ?? [];
        $ledger = [];
        foreach (['sent', 'bound'] as $kind) {
            foreach (self::SIDES as $side) {
                $ledger[$kind][$side] = array_map('intval', (array) ($saved[$kind][$side] ?? []));
            }
        }

        return $ledger;
    }

    /** How a thing binds: 'pickup' (to the hunter who got it), 'equip' (when worn), or 'account' */
    public static function binding(string $itemId): string
    {
        return self::catalog()[$itemId]['binding'] ?? 'pickup';
    }

    /**
     * How many of each thing a hunter has bound to himself: the bound-on-pickup things he has,
     * and of the rest, the copies he bound by wearing one (one he wears counts, if he never
     * did before this was kept).
     *
     * @return array<string, int>
     */
    public static function bound(User $user, string $side): array
    {
        $owned = self::owned($user, $side);
        $ledger = self::ledger($user)['bound'][$side];
        $worn = array_count_values(array_values(self::equipmentFor($user, $side) ?? []));
        $bound = [];
        foreach ($owned as $itemId => $count) {
            $copies = self::binding($itemId) === 'equip'
                ? max($ledger[$itemId] ?? 0, $worn[$itemId] ?? 0)
                : $count;
            if ($copies > 0) {
                $bound[$itemId] = min($count, $copies);
            }
        }

        return $bound;
    }

    /** Copies of a thing a hunter can send the other: his, binding when worn, not yet bound */
    public static function sendable(User $user, string $side, string $itemId): int
    {
        if (self::binding($itemId) !== 'equip') {
            return 0;
        }

        return max(0, (self::owned($user, $side)[$itemId] ?? 0) - (self::bound($user, $side)[$itemId] ?? 0));
    }

    /** Send so many unbound copies of a thing to the other hunter. Returns why not, or null. */
    public static function send(User $user, string $side, string $itemId, int $count): ?string
    {
        if (self::binding($itemId) !== 'equip') {
            return 'That is bound to your hunter: it cannot be sent.';
        }
        if ($count < 1 || $count > self::sendable($user, $side, $itemId)) {
            return 'Only copies not yet worn can be sent, and no more than there are.';
        }

        $ledger = self::ledger($user);
        $ledger['sent'][$side][$itemId] = ($ledger['sent'][$side][$itemId] ?? 0) + $count;
        $user->forceFill(['gear_ledger' => self::ledgerForSaving($ledger)])->save();

        return null;
    }

    /** What a hunter wears that binds when worn is his now: one copy of each */
    public static function bindWorn(User $user, string $side, array $worn): void
    {
        $ledger = self::ledger($user);
        $changed = false;
        foreach (array_count_values(array_values($worn)) as $itemId => $count) {
            if (self::binding((string) $itemId) === 'equip' && ($ledger['bound'][$side][$itemId] ?? 0) < $count) {
                $ledger['bound'][$side][$itemId] = $count;
                $changed = true;
            }
        }
        if ($changed) {
            $user->forceFill(['gear_ledger' => self::ledgerForSaving($ledger)])->save();
        }
    }

    private static function ledgerForSaving(array $ledger): array
    {
        foreach ($ledger as $kind => $sides) {
            foreach ($sides as $side => $counts) {
                $ledger[$kind][$side] = (object) array_filter($counts);
            }
        }

        return $ledger;
    }

    /** The game's own picture of an item (game/assets/items/gear), if it has one */
    private static function iconOf(string $itemId): ?string
    {
        return is_file(base_path('game/assets/items/gear/'.$itemId.'.webp')) ? 'assets/items/gear/'.$itemId.'.webp' : null;
    }

    /** What a side's hunter starts in: [slot => itemId] */
    public static function starterLoadout(string $side): array
    {
        return array_map(fn ($piece) => $piece['id'], config("gear.starter.$side", []));
    }

    /** Whether an item is one of the clothes the hunters start in */
    public static function isStarter(string $itemId): bool
    {
        foreach (self::SIDES as $side) {
            if (in_array($itemId, self::starterLoadout($side), true)) {
                return true;
            }
        }

        return false;
    }

    /** Whether a weapon is held in both hands, keeping the off hand empty. */
    public static function isTwoHanded(string $itemId): bool
    {
        return in_array($itemId, config('gear.two_handed', []), true);
    }

    /**
     * What a boss's item gives: the budget of its kind and rarity, grown by its boss's zone.
     *
     * @return array<string, int>
     */
    private static function bossItemStats(string $slot, string $rarity, int $zone, bool $twoHanded = false): array
    {
        $budget = config('gear.budget');
        $kind = self::KIND[$slot] ?? 'armor';
        // Held in both hands it gives more, for the off hand it keeps empty
        $growth = (1 + ($zone - 1) * $budget['per_zone']) * ($twoHanded ? (float) config('gear.two_handed_factor') : 1);

        $stats = [];
        foreach ($budget[$kind][$rarity] as $stat => $amount) {
            $stats[$stat] = in_array($stat, $budget['flat'], true) ? $amount : (int) round($amount * $growth);
        }

        // Rare items, and epic trinkets, help with carrying
        if ($rarity === 'rare' || ($rarity === 'epic' && $slot === 'trinket')) {
            $stats['carrying'] = $zone <= 3 ? $budget['carrying']['until_zone_3']
                : ($zone <= 7 ? $budget['carrying']['until_zone_7'] : $budget['carrying']['after']);
        }

        return $stats;
    }

    /**
     * How many of each catalogue item a side's hunter owns: what his side's bosses dropped and
     * what he caught in his side's games, less what he has sold, and the clothes he starts
     * in. Each hunter has his own: nothing won by one is the other's. Only items he has at
     * least one of. With no side, both hunters' together.
     *
     * @return array<string, int>
     */
    public static function owned(User $user, ?string $side = null): array
    {
        if ($side === null) {
            $both = [];
            foreach (self::SIDES as $each) {
                foreach (self::owned($user, $each) as $itemId => $count) {
                    $both[$itemId] = ($both[$itemId] ?? 0) + $count;
                }
            }

            return $both;
        }

        $catalog = self::catalog();
        $sold = self::sold($user, $side);
        $ledger = self::ledger($user);
        $other = $side === 'alliance' ? 'horde' : 'alliance';
        $owned = [];

        // What he found and what the other hunter sent him, less what he sent and sold
        $has = self::found($user, $side);
        foreach ($ledger['sent'][$other] as $itemId => $count) {
            $has[$itemId] = ($has[$itemId] ?? 0) + $count;
        }
        foreach ($has as $itemId => $count) {
            $left = $count - (int) ($ledger['sent'][$side][$itemId] ?? 0) - (int) ($sold[$itemId] ?? 0);
            if (isset($catalog[$itemId]) && $left > 0) {
                $owned[$itemId] = $left;
            }
        }

        // He has the clothes he starts in, once
        foreach (self::starterLoadout($side) as $itemId) {
            $owned[$itemId] = 1;
        }
        // The large quiver: the hunter whose boss dropped it has it
        if (in_array($side, self::quiverSides($user), true)) {
            $owned[self::LARGE_QUIVER] = 1;
        }

        return $owned;
    }

    /**
     * Everything a side's hunter ever won that is kept to wear or sell, sold or not: the loot
     * of his side's bosses, and the gear caught in his side's games.
     *
     * @return array<string, int>
     */
    private static function found(User $user, string $side): array
    {
        $catalog = self::catalog();

        $found = $user->bossDrops()
            ->selectRaw('item_id, count(*) as found')
            ->groupBy('item_id')
            ->pluck('found', 'item_id')
            ->filter(fn ($count, $itemId) => ($catalog[$itemId]['side'] ?? null) === $side)
            ->all();

        $caught = \App\Models\GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereIn('item_id', array_keys(config('gear.drops')))
            ->whereHas('game', fn ($game) => self::onSide($game->where('user_id', $user->id), $side))
            ->selectRaw('item_id, count(*) as found')
            ->groupBy('item_id')
            ->pluck('found', 'item_id')
            ->all();

        $all = [];
        foreach ([$found, $caught] as $counts) {
            foreach ($counts as $itemId => $count) {
                $all[$itemId] = ($all[$itemId] ?? 0) + (int) $count;
            }
        }

        return $all;
    }

    /**
     * Games played as a side's hunter. A game from before there were two sides was the
     * Alliance hunter's, the only one there was.
     */
    public static function onSide($games, string $side)
    {
        return $side === 'alliance'
            ? $games->where(fn ($query) => $query->where('faction', 'alliance')->orWhereNull('faction'))
            : $games->where('faction', $side);
    }

    /**
     * How many of each item a side's hunter has sold ({ alliance: {...}, horde: {...} } in
     * users.sold). What was sold before each hunter had his own was taken from the Alliance
     * hunter's, and what he did not have from the Horde hunter's.
     *
     * @return array<string, int>
     */
    public static function sold(User $user, string $side): array
    {
        $sold = $user->sold ?? [];
        if (self::isPerSide($sold)) {
            return $sold[$side] ?? [];
        }
        if ($side === 'alliance') {
            return $sold;
        }

        $alliance = self::found($user, 'alliance');
        $rest = [];
        foreach ($sold as $itemId => $count) {
            $over = (int) $count - ($alliance[$itemId] ?? 0);
            if ($over > 0) {
                $rest[$itemId] = $over;
            }
        }

        return $rest;
    }

    /** Both hunters' sold counts, the old single list shared out between them */
    public static function allSold(User $user): array
    {
        $all = [];
        foreach (self::SIDES as $side) {
            $all[$side] = (object) self::sold($user, $side);
        }

        return $all;
    }

    /**
     * What a side's hunter is wearing, with anything they no longer own taken out: what they
     * chose, or what that side starts in if they never chose.
     *
     * @return array<string, string>
     */
    public static function worn(User $user, string $side = 'alliance'): array
    {
        return self::valid($user, self::equipmentFor($user, $side) ?? self::starterLoadout($side), $side);
    }

    /**
     * What a player chose for a side's hunter to wear, as they saved it, or null if they never
     * chose. Each hunter has an outfit of its own ({ alliance: {...}, horde: {...} }). Saved
     * before that, one outfit was worn by both: it becomes each side's, with the clothes that
     * side starts in put on wherever that outfit left a slot empty (they were drawn on the
     * hunter then, as part of him).
     */
    public static function equipmentFor(User $user, string $side): ?array
    {
        $saved = $user->equipment;
        if ($saved === null) {
            return null;
        }
        if (self::isPerSide($saved)) {
            return isset($saved[$side]) && is_array($saved[$side]) ? self::quiverMoved($saved[$side]) : null;
        }

        return self::quiverMoved($saved + self::starterLoadout($side));
    }

    /**
     * An outfit saved when quivers were worn on the back: the quiver there is in the quiver
     * slot now (unless that has one already).
     */
    public static function quiverMoved(array $outfit): array
    {
        $back = $outfit['back'] ?? null;
        if ($back !== null && (self::catalog()[$back]['slot'] ?? null) === 'quiver') {
            unset($outfit['back']);
            $outfit['quiver'] ??= $back;
        }

        return $outfit;
    }

    /** Both hunters' outfits as saved, the old single outfit made into two */
    public static function allEquipment(User $user): array
    {
        $all = [];
        foreach (self::SIDES as $side) {
            $all[$side] = self::equipmentFor($user, $side);
        }

        return $all;
    }

    /**
     * Both hunters' saved sets (the character sheet's "Your sets"): { alliance: [...], horde:
     * [...] }. A list saved before each hunter had his own is the Alliance hunter's, as the
     * loot of then is.
     *
     * @return array<string, array<int, array>>
     */
    public static function allOutfits(User $user): array
    {
        $saved = $user->outfits ?? [];
        $all = array_fill_keys(self::SIDES, []);
        if (array_is_list($saved)) {
            $all['alliance'] = $saved;

            return $all;
        }
        foreach (self::SIDES as $side) {
            $all[$side] = is_array($saved[$side] ?? null) ? array_values($saved[$side]) : [];
        }

        return $all;
    }

    private static function isPerSide(array $saved): bool
    {
        return array_intersect(array_map('strval', array_keys($saved)), self::SIDES) !== [];
    }

    /**
     * What a player chose for a side's hunter to carry, as they saved it, or null if they
     * never chose. Each hunter carries his own ({ alliance: [...], horde: [...] }); a list
     * saved before that is both's (each keeps of it what he can wear).
     *
     * @return array<int, mixed>|null
     */
    public static function carriedFor(User $user, string $side): ?array
    {
        $saved = $user->carried;
        if ($saved === null) {
            return null;
        }
        if (self::isPerSide($saved)) {
            return isset($saved[$side]) && is_array($saved[$side]) ? array_values($saved[$side]) : null;
        }

        return array_values($saved);
    }

    /** Both hunters' carried lists as saved, the old single list made into two */
    public static function allCarried(User $user): array
    {
        $all = [];
        foreach (self::SIDES as $side) {
            $all[$side] = self::carriedFor($user, $side);
        }

        return $all;
    }

    /**
     * What a side's hunter takes into a game (carriedOf in game/utils/gear.js): what was
     * chosen, as far as it is still owned and his to wear, no more than the limit; what is
     * worn is added while there is room. A hunter whose player never chose takes what he
     * wears and then whatever else of his is owned, in the order the game lists it, up to the
     * limit.
     *
     * @param  array<int, mixed>|null  $chosen
     * @return array<int, string>
     */
    public static function carried(User $user, ?array $chosen, ?array $worn = null, string $side = 'alliance'): array
    {
        $limit = (int) config('gear.carry');
        $catalog = self::catalog();
        // The clothes the hunters start in are always with them, and never count; the other
        // side's loot is never his
        $counted = fn ($itemId) => is_string($itemId) && ! self::isStarter($itemId)
            && ($catalog[$itemId]['side'] ?? $side) === $side;
        $owned = array_values(array_filter(array_merge($user->setPieces($side), array_keys(self::owned($user, $side))), $counted));
        $worn = array_values(array_filter($worn ?? self::worn($user, $side), $counted));

        $list = $chosen === null ? array_merge($worn, $owned) : $chosen;
        $carried = [];
        foreach (array_merge($list, $worn) as $itemId) {
            if (count($carried) >= $limit) {
                break;
            }
            if (is_string($itemId) && in_array($itemId, $owned, true) && ! in_array($itemId, $carried, true)) {
                $carried[] = $itemId;
            }
        }

        return $carried;
    }

    /**
     * How much the gear being worn takes off the loss on things caught with the bags full,
     * as a share (0.02 = two hundredths).
     */
    public static function carrying(?User $user, ?string $side = null): float
    {
        if (! $user) {
            return 0.0;
        }

        $catalog = self::catalog();
        $points = 0;
        foreach (self::worn($user, $side ?? 'alliance') as $itemId) {
            $points += $catalog[$itemId]['stats']['carrying'] ?? 0;
        }

        return $points / 100;
    }

    /**
     * The slots each item that can be worn fits: [itemId => [slot, ...]].
     *
     * @return array<string, array<int, string>>
     */
    public static function slots(): array
    {
        $slots = [];

        foreach (config('loot.sets') as $set) {
            foreach (array_values($set['pieces']) as $index => $itemId) {
                $slots[$itemId] = self::SET_PIECE_SLOTS[$index] ?? [];
            }
        }

        foreach (self::catalog() as $itemId => $item) {
            $slots[$itemId] = self::WORN_IN[$item['slot']] ?? [];
        }

        return $slots;
    }

    /**
     * What the player asked to wear with everything taken out that cannot be worn: slots that
     * do not exist, items that are not theirs, items where they do not fit, second copies of
     * one item, anything in the off hand while a two-handed weapon is worn, and, for a side's
     * hunter, the other side's things.
     *
     * @param  array<string, mixed>  $wanted  [slot => itemId]
     * @return array<string, string>
     */
    public static function valid(User $user, array $wanted, ?string $side = null): array
    {
        $fits = self::slots();
        $catalog = self::catalog();
        $owned = array_merge($user->setPieces($side), array_keys(self::owned($user, $side)));
        $worn = [];

        foreach (self::SLOTS as $slot) {
            $itemId = $wanted[$slot] ?? null;

            if (is_string($itemId)
                && in_array($itemId, $owned, true)
                && in_array($slot, $fits[$itemId] ?? [], true)
                && ($side === null || ($catalog[$itemId]['side'] ?? $side) === $side)
                && ! in_array($itemId, $worn, true)) {
                $worn[$slot] = $itemId;
            }
        }

        // A weapon held in both hands leaves nothing for the off hand
        if (isset($worn['mainhand']) && self::isTwoHanded($worn['mainhand'])) {
            unset($worn['offhand']);
        }

        return $worn;
    }
}
