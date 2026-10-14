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
        'mainhand', 'offhand', 'ranged',
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
        'mainhand' => ['mainhand'], 'offhand' => ['offhand'], 'ranged' => ['ranged'],
    ];

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
     * @return array<string, array{name: string, image: string, slot: string, rarity: string, stats: array<string, int>, value: int, from: string}>
     */
    public static function catalog(): array
    {
        static $catalog = null;
        if ($catalog !== null && ! app()->runningUnitTests()) {
            return $catalog;
        }

        $catalog = [];
        $slots = config('gear.boss_slots');

        foreach (config('boss_loot.bosses') as $bosses) {
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
                        // It has no picture of its own: its boss's stands for it
                        'image' => $boss['image'],
                        'slot' => $slot,
                        'rarity' => $rarity,
                        'stats' => self::bossItemStats($slot, $rarity, $zone),
                        'value' => (int) config("gear.boss_value_per_zone.$rarity") * $zone,
                        'from' => $boss['name'],
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
                'rarity' => 'epic',
                'stats' => $drop['stats'],
                'value' => (int) config("loot.coins.$type"),
                'from' => 'Falls in a game',
            ];
        }

        return $catalog;
    }

    /**
     * What a boss's item gives: the budget of its kind and rarity, grown by its boss's zone.
     *
     * @return array<string, int>
     */
    private static function bossItemStats(string $slot, string $rarity, int $zone): array
    {
        $budget = config('gear.budget');
        $kind = self::KIND[$slot] ?? 'armor';
        $growth = 1 + ($zone - 1) * $budget['per_zone'];

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
     * How many of each catalogue item a player owns: what the bosses dropped for them and
     * what they caught, less what they have sold. Only items they have at least one of.
     *
     * @return array<string, int>
     */
    public static function owned(User $user): array
    {
        $catalog = self::catalog();

        $found = $user->bossDrops()
            ->selectRaw('item_id, count(*) as found')
            ->groupBy('item_id')
            ->pluck('found', 'item_id')
            ->all();

        $caught = \App\Models\GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereIn('item_id', array_keys(config('gear.drops')))
            ->whereHas('game', fn ($game) => $game->where('user_id', $user->id))
            ->selectRaw('item_id, count(*) as found')
            ->groupBy('item_id')
            ->pluck('found', 'item_id')
            ->all();

        $sold = $user->sold ?? [];
        $owned = [];

        foreach ($found + $caught as $itemId => $count) {
            $left = (int) $count - (int) ($sold[$itemId] ?? 0);
            if (isset($catalog[$itemId]) && $left > 0) {
                $owned[$itemId] = $left;
            }
        }

        return $owned;
    }

    /**
     * What a player's hunter is wearing, with anything they no longer own taken out.
     *
     * @return array<string, string>
     */
    public static function worn(User $user): array
    {
        return self::valid($user, $user->equipment ?? []);
    }

    /**
     * What a player's hunter takes into a game (carriedOf in game/utils/gear.js): what they
     * chose, as far as they still own it, no more than the limit; what is worn is added
     * while there is room. A player who never chose takes what they wear and then whatever
     * else they own, in the order the game lists it, up to the limit.
     *
     * @param  array<int, mixed>|null  $chosen
     * @return array<int, string>
     */
    public static function carried(User $user, ?array $chosen, ?array $worn = null): array
    {
        $limit = (int) config('gear.carry');
        $owned = array_merge($user->setPieces(), array_keys(self::owned($user)));
        $worn = array_values($worn ?? self::worn($user));

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
    public static function carrying(?User $user): float
    {
        if (! $user) {
            return 0.0;
        }

        $catalog = self::catalog();
        $points = 0;
        foreach (self::worn($user) as $itemId) {
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
     * do not exist, items that are not theirs, items where they do not fit, and second copies
     * of one item.
     *
     * @param  array<string, mixed>  $wanted  [slot => itemId]
     * @return array<string, string>
     */
    public static function valid(User $user, array $wanted): array
    {
        $fits = self::slots();
        $owned = array_merge($user->setPieces(), array_keys(self::owned($user)));
        $worn = [];

        foreach (self::SLOTS as $slot) {
            $itemId = $wanted[$slot] ?? null;

            if (is_string($itemId)
                && in_array($itemId, $owned, true)
                && in_array($slot, $fits[$itemId] ?? [], true)
                && ! in_array($itemId, $worn, true)) {
                $worn[$slot] = $itemId;
            }
        }

        return $worn;
    }
}
