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

        // One given by an admin; and before each hunter had his own, the account's was the
        // Alliance hunter's
        foreach (self::SIDES as $side) {
            if ((Grants::grantedGear($user, $side)[self::LARGE_QUIVER] ?? 0) > 0) {
                $sides[] = $side;
            }
        }
        if ($user->quiver && $user->bossDrops()->where('quiver', true)->doesntExist()) {
            $sides[] = 'alliance';
        }

        return array_values(array_unique($sides));
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

                    $level = self::bossItemLevel($zone, $rarity);
                    $catalog[$item['id']] = [
                        'name' => $item['name'],
                        // Its own picture, or else its boss's stands for it
                        'image' => self::iconOf($item['id']) ?? $boss['image'],
                        'slot' => $slot,
                        'rarity' => $rarity,
                        'itemLevel' => $level,
                        'stats' => self::statsFor($slot, $level, self::isTwoHanded($item['id'])),
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
                // Its own gear icon if it has one, or else the picture it falls as
                'image' => self::iconOf($itemId) ?? $items[$itemId]['image'],
                'slot' => $drop['slot'],
                'rarity' => $drop['rarity'] ?? 'epic',
                'itemLevel' => $drop['item_level'],
                'stats' => self::statsFor($drop['slot'], $drop['item_level'], self::isTwoHanded($itemId), $drop['mix'] ?? null),
                'twoHanded' => self::isTwoHanded($itemId),
                'value' => (int) config("loot.coins.$type"),
                'from' => 'Falls in a game',
                'binding' => 'equip',
            ];
        }

        // Each zone's own gear (config/gear.php "zone_items"): carried by its creatures, falling
        // in it, and dropped by its boss. The hunter's who found it; either hunter's body can
        // wear it. Bound when picked up, or (the later waves) when worn.
        foreach (self::zoneItems() as $itemId => $item) {
            $catalog[$itemId] = [
                'name' => $item['name'],
                'image' => self::iconOf($itemId) ?? 'assets/items/gear/'.$itemId.'.webp',
                'slot' => $item['slot'],
                'rarity' => $item['rarity'],
                'itemLevel' => $item['item_level'],
                'stats' => $item['stats'],
                'twoHanded' => self::isTwoHanded($itemId),
                'value' => (int) $item['value'],
                'from' => 'Found in '.$item['zoneName'],
                'binding' => $item['binding'] ?? 'pickup',
            ];
        }

        // What is made, not found (config/crafting.php): the maker's for good, bound to him
        foreach (config('gear.crafted', []) as $itemId => $made) {
            $catalog[$itemId] = [
                'name' => $made['name'],
                'image' => self::iconOf($itemId) ?? config("crafting.items.$itemId.image"),
                'slot' => $made['slot'],
                'rarity' => $made['rarity'],
                'itemLevel' => $made['item_level'],
                'stats' => self::statsFor($made['slot'], $made['item_level'], self::isTwoHanded($itemId), $made['mix'] ?? null),
                'twoHanded' => self::isTwoHanded($itemId),
                'value' => 0,
                'from' => 'Crafted',
                'binding' => 'pickup',
                'effect' => $made['effect'] ?? null,
            ];
        }

        // The large quiver a boss may drop (boss_loot.quiver): worn in the quiver slot, it adds
        // slots to the quiver while it is on (quiverSlots; quiver in game/config/gameConfig.js)
        $catalog[self::LARGE_QUIVER] = [
            'name' => config('boss_loot.quiver.name'),
            'image' => self::iconOf(self::LARGE_QUIVER) ?? 'assets/powerups/thorium-arrows.webp',
            'slot' => 'quiver',
            'rarity' => 'epic',
            'itemLevel' => null,
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
                    'itemLevel' => (int) config('gear.item_levels.starter'),
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
     * @return array{sent: array<string, array<string, int>>, bound: array<string, array<string, int>>, crafted: array<string, array<string, int>>}
     */
    public static function ledger(User $user): array
    {
        $saved = $user->gear_ledger ?? [];
        $ledger = [];
        foreach (['sent', 'bound', 'crafted'] as $kind) {
            foreach (self::SIDES as $side) {
                $ledger[$kind][$side] = array_map('intval', (array) ($saved[$kind][$side] ?? []));
            }
        }

        return $ledger;
    }

    /**
     * A hunter made a piece of gear (Bags::craft): it is his, and bound to him.
     */
    public static function addCrafted(User $user, string $side, string $itemId): void
    {
        $ledger = self::ledger($user);
        $ledger['crafted'][$side][$itemId] = ($ledger['crafted'][$side][$itemId] ?? 0) + 1;
        $ledger['bound'][$side][$itemId] = ($ledger['bound'][$side][$itemId] ?? 0) + 1;
        $user->forceFill(['gear_ledger' => self::ledgerForSaving($ledger)])->save();
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

    /**
     * The game's own picture of an item (game/assets/items/gear), if it has one. Its address
     * carries the time it was last changed, so a picture redrawn under the same name is not
     * taken from the browser's cache.
     */
    private static function iconOf(string $itemId): ?string
    {
        $file = base_path('game/assets/items/gear/'.$itemId.'.webp');

        return is_file($file) ? 'assets/items/gear/'.$itemId.'.webp?v='.filemtime($file) : null;
    }

    /**
     * Each zone's own gear, by item: its entry in config/gear.php "zone_items", with the side
     * and zone (1 is the first) whose creatures carry it, and that zone's name.
     *
     * @return array<string, array>
     */
    public static function zoneItems(): array
    {
        $items = [];
        foreach (config('gear.zone_items', []) as $side => $zones) {
            foreach ($zones as $zone => $pool) {
                foreach ($pool as $itemId => $item) {
                    $items[$itemId] = $item + ['side' => $side, 'zone' => (int) $zone, 'zoneName' => self::zoneName($side, (int) $zone)];
                }
            }
        }

        return $items;
    }

    /** The name of a side's zone, as the game shows it (game/data/backgrounds.js) */
    public static function zoneName(string $side, int $zone): string
    {
        return config("gear.zone_names.$side.$zone", ucfirst($side)." zone $zone");
    }

    /** The gear that can be caught in a game, and is then the catching hunter's to keep */
    public static function foundInGames(): array
    {
        return array_merge(array_keys(config('gear.drops')), array_keys(self::zoneItems()));
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
     * The item level of a boss's item: its zone's, one step up for each step of rarity
     * (config/gear.php, item_levels).
     */
    public static function bossItemLevel(int $zone, string $rarity): int
    {
        $levels = config('gear.item_levels');

        return $levels['first_zone'] + $levels['per_zone'] * ($zone - 1 + ($levels['rarity_steps'][$rarity] ?? 0));
    }

    /**
     * What an item gives, from its item level and the kind of slot it is worn in: so many
     * stat points for each level, spent on its stats by its mix (its own, or its kind's). Held
     * in both hands it has more, for the off hand it keeps empty. A weapon of a high enough
     * level spends some on crit. Rarity plays no part: two items of a level and kind are as
     * strong as each other.
     *
     * @param  array<string, float>|null  $mix  Shares of the points, by stat
     * @return array<string, int>
     */
    public static function statsFor(string $slot, int $level, bool $twoHanded = false, ?array $mix = null): array
    {
        $rules = config('gear.item_levels');
        $kind = self::KIND[$slot] ?? 'armor';
        $points = $level * $rules['points_per_level'][$kind] * ($twoHanded ? (float) config('gear.two_handed_factor') : 1);

        $stats = [];
        if ($mix === null && $kind === 'weapon' && $level >= $rules['weapon_crit_from']) {
            $stats['crit'] = 1;
            $points -= $rules['cost']['crit'];
        }
        $mix ??= $rules['mix'][$slot === 'trinket' ? 'trinket' : $kind];
        foreach ($mix as $stat => $share) {
            $amount = (int) round($points * $share / $rules['cost'][$stat]);
            if ($amount > 0) {
                $stats[$stat] = $amount;
            }
        }

        return $stats;
    }

    /** What a set of stats is worth, in the stat points item levels give (config/gear.php) */
    public static function statPoints(array $stats): float
    {
        $cost = config('gear.item_levels.cost');

        return array_sum(array_map(fn ($stat, $amount) => ($cost[$stat] ?? 0) * $amount, array_keys($stats), $stats));
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

        // What his side's bosses dropped (a boss's own item, or one of its pool, which may be
        // anyone's: the side is the boss's)
        $found = [];
        $drops = $user->bossDrops()->selectRaw('boss_id, item_id, count(*) as found')->groupBy('boss_id', 'item_id')->get();
        foreach ($drops as $drop) {
            if (isset($catalog[$drop->item_id]) && (BossLoot::boss($drop->boss_id)['faction'] ?? null) === $side) {
                $found[$drop->item_id] = ($found[$drop->item_id] ?? 0) + (int) $drop->found;
            }
        }

        $caught = \App\Models\GameDrop::query()
            ->whereNotNull('claimed_at')
            ->whereIn('item_id', self::foundInGames())
            ->whereHas('game', fn ($game) => self::onSide($game->where('user_id', $user->id), $side))
            ->selectRaw('item_id, count(*) as found')
            ->groupBy('item_id')
            ->pluck('found', 'item_id')
            ->all();

        // And what an admin gave him (Grants), the large quiver aside (quiverSides), and what
        // he made (crafted, in the ledger)
        $granted = Grants::grantedGear($user, $side);
        unset($granted[self::LARGE_QUIVER]);
        $crafted = self::ledger($user)['crafted'][$side];

        $all = [];
        foreach ([$found, $caught, $granted, $crafted] as $counts) {
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
        return self::dressed($user, self::equipmentFor($user, $side) ?? self::starterLoadout($side), $side);
    }

    /**
     * An outfit chosen, as it can be worn: a piece that cannot be (no longer owned, or never
     * his) leaves the clothes he starts in in its slot, not a bare one; a slot emptied on
     * purpose stays empty.
     *
     * @return array<string, string>
     */
    public static function dressed(User $user, array $wanted, string $side): array
    {
        $worn = self::valid($user, $wanted, $side);
        $starter = self::starterLoadout($side);
        foreach ($wanted as $slot => $itemId) {
            if ($itemId && ! isset($worn[$slot]) && isset($starter[$slot])) {
                $worn[$slot] = $starter[$slot];
            }
        }

        return self::valid($user, $worn, $side);
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
     * An outfit with nothing in the main hand: the side's starter weapon goes there. The hunters
     * had none before melee, so every outfit saved then has an empty hand (put right once, by
     * the migration that gave them one; an empty hand after that is the player's choice).
     */
    public static function withStarterWeapon(array $equipment, string $side): array
    {
        $weapon = config("gear.starter.$side.mainhand.id");
        if ($weapon && empty($equipment['mainhand'])) {
            $equipment['mainhand'] = $weapon;
        }

        return $equipment;
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
     * What each hunter wears but is not to be seen in: { alliance: [item ids], horde: [...] }.
     * It still counts for him; it is only not drawn.
     *
     * @return array<string, array<int, string>>
     */
    public static function allHidden(User $user): array
    {
        $saved = $user->hidden_gear ?? [];
        $all = [];
        foreach (self::SIDES as $side) {
            $all[$side] = array_values(array_unique(array_filter($saved[$side] ?? [], 'is_string')));
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

    /**
     * Gear a hunter caught in a game goes with him (into his 36, besides what he wears) while
     * there is room, as it does in the game; with his 36 full, into his bags while they have a
     * slot free (bagGear); else it is in his bank. A list never chosen takes what he owns anyway
     * (carried), so only what goes into the bags is kept for him then.
     *
     * @param  array<int, string>  $itemIds
     */
    public static function carryCaught(User $user, string $side, array $itemIds): void
    {
        $saved = $user->carried;
        $chosen = self::carriedFor($user, $side);
        // Never chosen: he takes what he has anyway, while there is room (carried)
        $list = $chosen ?? self::carried($user, null, null, $side);

        $limit = (int) config('gear.carry');
        $catalog = self::catalog();
        $worn = array_values(self::worn($user, $side));
        $bagGear = self::bagGear($user, $side);
        $free = Bags::freeSlots($user, $side);
        $changed = false;
        $bagged = false;
        foreach (array_unique($itemIds) as $itemId) {
            $isGear = isset($catalog[$itemId]) || in_array($itemId, $user->setPieces($side), true);
            if (! $isGear || self::isStarter($itemId) || in_array($itemId, $list, true) || in_array($itemId, $bagGear, true)) {
                continue;
            }
            if (($catalog[$itemId]['side'] ?? $side) !== $side) {
                continue;
            }
            if (count(array_diff($list, $worn)) < $limit) {
                $list[] = $itemId;
                $changed = true;
            } elseif ($free > 0) {
                // His 36 are full: into a bag, a slot of it
                $bagGear[] = $itemId;
                $free--;
                $bagged = true;
            }
        }
        if ($bagged) {
            self::keepBagGear($user, $side, $bagGear);
        }
        if (! $changed || $chosen === null) {
            return;
        }

        $all = self::isPerSide($saved ?? []) ? $saved : self::allCarried($user);
        $all[$side] = $list;
        $user->forceFill(['carried' => $all])->save();
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
        // All his gear counts, the clothes he starts in too; the other side's loot is never his
        $counted = fn ($itemId) => is_string($itemId)
            && ($catalog[$itemId]['side'] ?? $side) === $side;
        $owned = array_values(array_filter(array_merge($user->setPieces($side), array_keys(self::owned($user, $side))), $counted));
        $worn = array_values(array_filter($worn ?? self::worn($user, $side), $counted));

        // Never chosen: what he has, less what he keeps in his bags (a list chosen is as chosen;
        // what is in it is not kept in the bags too: validBagGear)
        $list = $chosen === null ? array_values(array_diff($owned, self::bagGear($user, $side))) : $chosen;
        $carried = [];
        // What he wears is with him, and takes no room in his 36
        foreach ($worn as $itemId) {
            if (in_array($itemId, $owned, true) && ! in_array($itemId, $carried, true)) {
                $carried[] = $itemId;
            }
        }
        // His 36: what else he carries, not worn
        $room = $limit;
        foreach ($list as $itemId) {
            if ($room <= 0) {
                break;
            }
            if (is_string($itemId) && in_array($itemId, $owned, true) && ! in_array($itemId, $carried, true)) {
                $carried[] = $itemId;
                $room--;
            }
        }

        return $carried;
    }

    /**
     * The gear a side's hunter keeps in his bags besides his 36, a slot a piece
     * (users.bag_gear: { alliance: [...], horde: [...] }).
     *
     * @return array<int, string>
     */
    public static function bagGear(User $user, string $side): array
    {
        $saved = $user->bag_gear[$side] ?? [];

        return array_values(array_unique(array_filter(is_array($saved) ? $saved : [], 'is_string')));
    }

    /**
     * What a side's hunter asked to keep in his bags, with everything taken out that cannot be
     * there: what is not his, what he wears or has in his 36, second copies, and what there is
     * no room for once the bags hold what they hold.
     *
     * @param  array<int, mixed>  $wanted
     * @param  array<int, string>  $carried  what he wears and has in his 36
     * @return array<int, string>
     */
    public static function validBagGear(User $user, array $wanted, array $carried, string $side): array
    {
        $catalog = self::catalog();
        $owned = array_merge($user->setPieces($side), array_keys(self::owned($user, $side)));
        $room = (int) config('loot.bags.backpack') + array_sum(array_slice($user->bags ?? [], 0, (int) config('loot.bags.bag_slots')))
            - Bags::slotsUsed(Bags::contents($user, $side));

        $kept = [];
        foreach ($wanted as $itemId) {
            if (count($kept) >= $room) {
                break;
            }
            if (is_string($itemId) && in_array($itemId, $owned, true) && ! in_array($itemId, $carried, true)
                && ! in_array($itemId, $kept, true) && ($catalog[$itemId]['side'] ?? $side) === $side) {
                $kept[] = $itemId;
            }
        }

        return $kept;
    }

    /** Keep a side's hunter's bag gear as given, the other's as it was */
    public static function keepBagGear(User $user, string $side, array $itemIds): void
    {
        $all = [];
        foreach (self::SIDES as $each) {
            $all[$each] = $each === $side ? array_values($itemIds) : self::bagGear($user, $each);
        }
        $user->forceFill(['bag_gear' => $all])->save();
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
