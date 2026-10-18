<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Bags;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * How big everyone's backpack is: on the site and in the game alike.
 */
class BackpackTest extends TestCase
{
    use RefreshDatabase;

    public function test_everyone_starts_with_a_backpack_of_twenty_four_slots_in_the_game_too(): void
    {
        $this->assertSame(24, config('loot.bags.backpack'));
        $this->assertSame(24, Bags::capacity(User::factory()->create()));

        $game = file_get_contents(base_path('game/config/gameConfig.js'));
        $this->assertMatchesRegularExpression('/backpack:\s*24,/', $game);
    }
}
