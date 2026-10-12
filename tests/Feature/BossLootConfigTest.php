<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * config/boss_loot.php repeats the game's bosses, and "coins" in config/loot.php the game's
 * coin values; this keeps them in step.
 */
class BossLootConfigTest extends TestCase
{
    public function test_the_bosses_match_the_game_in_order(): void
    {
        $source = file_get_contents(base_path('game/data/bosses.js'));

        foreach (config('boss_loot.bosses') as $faction => $bosses) {
            preg_match('/'.$faction.':\s*\[(.*?)\n    \]/s', $source, $side);
            preg_match_all('/\{ id: \'([^\']+)\',.*? name: (?:\'([^\']+)\'|"([^"]+)"), image: \'([^\']+)\'/', $side[1] ?? '', $matches, PREG_SET_ORDER);

            $inGame = array_map(fn (array $m) => [$m[1], $m[2] !== '' ? $m[2] : $m[3], "assets/bosses/$faction/{$m[4]}.webp"], $matches);
            $here = [];
            foreach ($bosses as $bossId => $boss) {
                $here[] = [$bossId, $boss['name'], $boss['image']];
            }

            $this->assertCount(10, $inGame);
            $this->assertSame($inGame, $here, "Bosses of the $faction");
        }
    }

    public function test_every_boss_has_an_item_of_each_rarity_and_no_two_items_share_an_id(): void
    {
        $rarities = array_keys(config('boss_loot.chances'));
        $ids = [];

        foreach (config('boss_loot.bosses') as $bosses) {
            foreach ($bosses as $boss) {
                $this->assertSame($rarities, array_keys($boss['loot']));
                $this->assertFileExists(base_path('game/'.$boss['image']));
                array_push($ids, ...array_column($boss['loot'], 'id'));
            }
        }

        $this->assertSame($ids, array_unique($ids));
        $this->assertEqualsWithDelta(1.0, array_sum(config('boss_loot.chances')), 0.0001);
    }

    public function test_zone_length_and_unlock_levels_match_the_game(): void
    {
        $source = file_get_contents(base_path('game/config/gameConfig.js'));

        preg_match('/levelsPerBackground:\s*(\d+)/', $source, $match);
        $this->assertSame((int) $match[1], config('boss_loot.levels_per_zone'));

        preg_match('/unlockLevel: \{(.*?)\}/s', $source, $block);
        $this->assertEqualsCanonicalizing(config('loot.server_types'), array_keys(config('loot.unlock_level')));
        foreach (config('loot.unlock_level') as $type => $level) {
            $this->assertMatchesRegularExpression('/\b'.$type.':\s*'.$level.'\s*,/', $block[1], "Unlock level of $type");
        }
    }

    public function test_the_coin_values_match_the_game(): void
    {
        $source = file_get_contents(base_path('game/config/gameConfig.js'));
        preg_match('/\n    coins: \{(.*?)\n    \},/s', $source, $block);
        $this->assertNotEmpty($block);

        $this->assertEqualsCanonicalizing(array_keys(config('loot.weights')), array_keys(config('loot.coins')));
        foreach (config('loot.coins') as $type => $value) {
            $this->assertMatchesRegularExpression('/\b'.$type.':\s*'.$value.'\s*,/', $block[1], "Coins for $type");
        }

        $this->assertMatchesRegularExpression('/bossPerZone:\s*'.config('loot.boss_coins_per_zone').'\s*,/', $block[1]);
    }
}
