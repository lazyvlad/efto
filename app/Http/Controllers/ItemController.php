<?php

namespace App\Http\Controllers;

use App\Support\BossLoot;
use App\Support\Coins;
use App\Support\Gear;
use App\Support\LootTable;
use Illuminate\View\View;

class ItemController extends Controller
{
    /** The character sheet's name for where a thing is worn (the game's word as the key) */
    private const WORN = [
        'head' => 'Head', 'neck' => 'Neck', 'shoulders' => 'Shoulders', 'back' => 'Back',
        'chest' => 'Chest', 'shirt' => 'Shirt', 'tabard' => 'Tabard', 'bracers' => 'Wrist',
        'hands' => 'Hands', 'belt' => 'Waist', 'legs' => 'Legs', 'boots' => 'Feet',
        'ring' => 'Ring', 'trinket' => 'Trinket', 'mainhand' => 'Main hand',
        'offhand' => 'Off hand', 'ranged' => 'Ranged',
    ];

    /**
     * Everything in the game and what becomes of it: the hunter sets and what they give, the
     * bosses with what each of their drops gives, the weapons and jewellery that fall, the
     * crafting materials, and what is sold for coins.
     */
    public function index(): View
    {
        $items = LootTable::catalog();
        $gear = Gear::catalog();
        $materials = config('loot.materials');

        // The hunter sets
        $sets = [];
        foreach (config('loot.sets') as $setId => $set) {
            $bossZones = array_keys(array_filter(config('boss_loot.set_pieces.by_zone', []), fn ($id) => $id === $setId));
            $bonuses = [];
            foreach ($set['bonuses'] as $pieces => $bonus) {
                $bonuses[$pieces] = self::bonusText($bonus);
            }
            $sets[] = [
                'name' => $set['name'],
                'tier' => $set['tier'],
                'fromLevel' => $set['from_level'],
                'bossZones' => $bossZones ? ($bossZones === [min($bossZones)] ? (string) min($bossZones) : min($bossZones).'–'.max($bossZones)) : null,
                'perPiece' => self::statsText($set['per_piece']),
                'bonuses' => $bonuses,
                'pieces' => array_map(fn ($itemId) => $items[$itemId], $set['pieces']),
            ];
        }

        // The bosses, each drop as the gear it is
        $bosses = [];
        foreach (BossLoot::catalog() as $side => $sideBosses) {
            foreach ($sideBosses as $index => $boss) {
                $bosses[$side][] = [
                    'name' => $boss['name'],
                    'image' => $boss['image'],
                    'zone' => $index + 1,
                    'coins' => Coins::format(($index + 1) * (int) config('loot.boss_coins_per_zone')),
                    'loot' => array_map(fn ($item) => self::gearRow($item['id'], $gear[$item['id']] ?? null) + ['rarity' => $item['rarity'], 'name' => $item['name']], $boss['loot']),
                ];
            }
        }

        // The weapons and jewellery found in a game: falling, or (the epics) dropped by the
        // bosses of the later zones
        $bossZones = [];
        foreach (config('boss_loot.pools') as $bossId => $pool) {
            foreach ($pool as $rarityItems) {
                foreach (array_keys($rarityItems) as $itemId) {
                    $bossZones[$itemId][] = BossLoot::boss($bossId)['zone'];
                }
            }
        }
        $falling = [];
        foreach (array_keys(config('gear.drops')) as $itemId) {
            $zones = array_values(array_unique($bossZones[$itemId] ?? []));
            sort($zones);
            $falling[] = self::gearRow($itemId, $gear[$itemId]) + [
                'name' => $items[$itemId]['name'],
                'image' => $items[$itemId]['image'],
                'rarity' => $gear[$itemId]['rarity'] ?? 'epic',
                'from' => in_array($itemId, config('loot.never_falls', []), true) && $zones
                    ? __('Dropped by the bosses of zone :zones', ['zones' => implode(' and ', $zones)])
                    : __('Falls in a game'),
            ];
        }

        // Each zone's own gear, by side and zone
        $zoneGear = [];
        $armorIds = array_merge(...array_map('array_keys', array_values(config('gear.zone_armor', [])) ?: [[]]));
        foreach (Gear::zoneItems() as $itemId => $item) {
            // The armor sets have their own list below: only the bosses drop them
            if (in_array($itemId, $armorIds, true)) {
                continue;
            }
            // Gear both sides' zones carry is listed under each
            foreach ($item['sides'] as $side) {
                $zoneGear[$side][$item['zone']]['name'] = $item['zoneNames'][$side];
                $zoneGear[$side][$item['zone']]['items'][] = self::gearRow($itemId, $gear[$itemId]) + ['name' => $item['name'], 'image' => asset('game/'.$gear[$itemId]['image']), 'rarity' => $item['rarity']];
            }
        }
        foreach ($zoneGear as &$zones) {
            ksort($zones);
        }
        unset($zones);

        // What is neither worn nor kept: sold for coins as a game ends, rarest first
        $kept = array_merge(array_keys(config('gear.drops')), $materials, ...array_map(fn ($set) => $set['pieces'], array_values(config('loot.sets'))));
        $groups = [];
        foreach ($items as $item) {
            if (! in_array($item['id'], $kept, true)) {
                $groups[$item['type']][] = $item;
            }
        }
        $sold = [];
        foreach ($groups as $type => $groupItems) {
            $sold[] = ['type' => $type, 'coins' => Coins::format((int) config("loot.coins.$type", 0)), 'items' => $groupItems];
        }

        // The early zones' armor sets (config/gear.php "zone_armor"): both sides', each zone's
        // set with the bosses whose extra drops they are
        $zoneArmor = [];
        $extraZones = config('boss_loot.extras.zones', []);
        foreach (config('gear.zone_armor', []) as $zone => $pool) {
            $bossNames = [];
            foreach (Gear::SIDES as $side) {
                $bossId = array_keys(config("boss_loot.bosses.$side", []))[$zone - 1] ?? null;
                if ($bossId) {
                    $bossNames[] = __(':boss in :place', ['boss' => config("boss_loot.bosses.$side.$bossId.name"), 'place' => Gear::zoneName($side, (int) $zone)]);
                }
            }
            $zoneArmor[] = [
                'zone' => (int) $zone,
                'bosses' => $bossNames,
                'extras' => (int) ($extraZones[$zone] ?? 0),
                'items' => array_map(fn ($itemId) => self::gearRow($itemId, $gear[$itemId]) + ['name' => $gear[$itemId]['name'], 'image' => asset('game/'.$gear[$itemId]['image']), 'rarity' => $gear[$itemId]['rarity']],
                    array_values(array_filter(array_keys($pool), fn ($itemId) => isset($gear[$itemId])))),
            ];
        }

        return view('items', [
            'zoneArmor' => $zoneArmor,
            'sets' => $sets,
            'bosses' => $bosses,
            'falling' => $falling,
            'zoneGear' => $zoneGear,
            'zoneSky' => config('loot.zone_sky'),
            'materials' => array_map(fn ($itemId) => $items[$itemId], $materials),
            'sold' => $sold,
            'total' => count($items),
            'chances' => config('boss_loot.chances'),
            'quiverName' => config('boss_loot.quiver.name'),
            'quiverChance' => round(config('boss_loot.quiver.chance') * 100),
            'skipCost' => Coins::format((int) config('boss_loot.skip_cost_per_zone')),
            'rushFee' => Coins::format((int) config('boss_loot.rush.entry_fee')),
            'carry' => (int) config('gear.carry'),
            'backpack' => (int) config('loot.bags.backpack'),
            'stack' => (int) config('loot.bags.stack'),
            'fullShare' => (int) round((1 - (float) config('loot.bags.full_penalty')) * 100),
        ]);
    }

    /** Where a piece of gear is worn, what it gives and what it sells for */
    private static function gearRow(string $itemId, ?array $item): array
    {
        return [
            'id' => $itemId,
            'worn' => $item ? (self::WORN[$item['slot']] ?? ucfirst($item['slot'])) : '',
            'twoHanded' => (bool) ($item['twoHanded'] ?? false),
            'itemLevel' => $item['itemLevel'] ?? null,
            'stats' => $item ? self::statsText($item['stats']) : '',
            'value' => $item ? Coins::format((int) $item['value']) : '',
        ];
    }

    /** "+3 health, +4 armor, +2 attack power, +1% crit, carrying +2%" */
    private static function statsText(array $stats): string
    {
        $parts = [];
        foreach (['health' => '+%d health', 'armor' => '+%d armor', 'attackPower' => '+%d attack power', 'crit' => '+%d%% crit', 'dodge' => '+%d%% dodge', 'carrying' => 'carrying +%d%%'] as $stat => $format) {
            if (! empty($stats[$stat])) {
                $parts[] = sprintf($format, $stats[$stat]);
            }
        }

        return implode(', ', $parts);
    }

    /** What a set gives at a step, as the game says it (bonusText in game/utils/sets.js) */
    private static function bonusText(array $bonus): string
    {
        $parts = [];
        foreach (['crit' => '+%d%% crit', 'dodge' => '+%d%% dodge', 'bossDamage' => '+%d%% damage to bosses', 'multishot' => 'Multishot hits %d%% harder', 'arcane' => 'Arcane Shot hits %d%% harder'] as $stat => $format) {
            if (! empty($bonus[$stat])) {
                $parts[] = sprintf($format, round($bonus[$stat] * 100));
            }
        }

        return implode(', ', $parts);
    }
}
