<?php

namespace Tests\Feature;

use App\Support\LootTable;
use Tests\TestCase;

/**
 * config/loot.php repeats the game's item list and weights; this keeps the two in step.
 */
class LootConfigTest extends TestCase
{
    public function test_the_items_match_the_game(): void
    {
        $source = file_get_contents(base_path('game/data/gameItems.js'));
        preg_match_all('/\{\s*id:\s*"([^"]+)".*?type:\s*"([^"]+)"/s', $source, $matches, PREG_SET_ORDER);

        $inGame = [];
        foreach ($matches as [, $id, $type]) {
            $inGame[$type][] = $id;
        }

        $this->assertNotEmpty($inGame);
        $this->assertEqualsCanonicalizing(array_keys($inGame), array_keys(config('loot.items')));

        foreach ($inGame as $type => $ids) {
            $this->assertEqualsCanonicalizing($ids, config("loot.items.$type"), "Items of type $type");
        }
    }

    public function test_the_weights_and_spawn_rate_match_the_game(): void
    {
        $source = file_get_contents(base_path('game/config/gameConfig.js'));

        foreach (config('loot.weights') as $type => $weight) {
            $this->assertMatchesRegularExpression('/\b'.$type.':\s*'.preg_quote((string) $weight, '/').'\s*,/', $source, "Weight of $type");
        }

        preg_match('/itemSpawnChance:\s*([\d.]+)/', $source, $match);
        $this->assertEqualsWithDelta((float) $match[1] * 60, config('loot.spawns_per_second'), 0.0001);
    }

    public function test_the_catalog_covers_every_item_with_the_game_s_name_and_a_picture_that_exists(): void
    {
        $this->assertEqualsCanonicalizing(LootTable::itemIds(), array_keys(config('loot.catalog')));

        $rare = array_merge(...array_map(fn (string $type) => config("loot.items.$type"), config('loot.server_types')));
        $this->assertEqualsCanonicalizing($rare, array_keys(LootTable::rareCatalog()));
        $this->assertSame('regular', LootTable::catalog()['runecloth']['type']);

        $source = file_get_contents(base_path('game/data/gameItems.js'));

        foreach (config('loot.catalog') as $itemId => $item) {
            $this->assertStringContainsString('id: "'.$itemId.'", name: "'.$item['name'].'"', $source);
            $this->assertFileExists(base_path('game/'.$item['image']));
        }
    }

    public function test_the_game_and_the_server_agree_on_which_rarities_the_server_decides(): void
    {
        $source = file_get_contents(base_path('game/systems/lootSystem.js'));
        preg_match('/SERVER_TYPES = new Set\(\[([^\]]+)\]\)/', $source, $match);
        preg_match_all("/'([^']+)'/", $match[1] ?? '', $types);

        $this->assertEqualsCanonicalizing(config('loot.server_types'), $types[1]);
    }
}
