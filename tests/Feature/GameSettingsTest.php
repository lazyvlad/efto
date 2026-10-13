<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\GameSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    /**
     * Every setting as it stands, in the shape the form posts.
     */
    private function form(array $changes = []): array
    {
        $settings = app(GameSettings::class);

        return $changes + collect($settings->definitions())->map(fn ($setting, $key) => $settings->value($key))->all();
    }

    public function test_every_setting_points_at_a_real_value_with_a_sane_range(): void
    {
        $source = file_get_contents(base_path('game/config/gameConfig.js'));
        $settings = app(GameSettings::class);

        foreach ($settings->definitions() as $key => $setting) {
            $this->assertTrue(isset($setting['config']) || isset($setting['game']), "$key changes nothing");
            $this->assertArrayHasKey($setting['group'], config('game_settings.groups'), "$key is in an unknown group");

            if (isset($setting['config'])) {
                $this->assertIsNumeric(config($setting['config']), "$key: no such server value");
            } else {
                // Only the game has it: the default written here must be the game's
                $this->assertSame(1, preg_match('~'.$setting['source'].'~', $source, $match), "$key was not found in gameConfig.js");
                $this->assertEqualsWithDelta((float) $match[1], $setting['default'], 1e-9, "$key has another value in gameConfig.js");
            }

            $own = $settings->default($key);
            $this->assertTrue($own >= $setting['min'] && $own <= $setting['max'], "$key: the game's own value is outside its range");
        }
    }

    public function test_the_game_s_place_for_a_setting_exists_in_the_game(): void
    {
        $source = file_get_contents(base_path('game/config/gameConfig.js'));

        foreach (app(GameSettings::class)->definitions() as $key => $setting) {
            foreach (explode('.', $setting['game'] ?? '') as $part) {
                if ($part !== '') {
                    $this->assertMatchesRegularExpression('/\b'.$part.':/', $source, "$key: \"$part\" is not in gameConfig.js");
                }
            }
        }
    }

    public function test_the_settings_page_is_for_admins(): void
    {
        $this->actingAs(User::factory()->create())->get(route('admin.settings.edit'))->assertNotFound();
        $this->actingAs(User::factory()->create())->post(route('admin.settings.update'), $this->form())->assertNotFound();

        $this->actingAs($this->admin())->get(route('admin.settings.edit'))
            ->assertOk()
            ->assertSee('Health of the first boss')
            ->assertSee('Nothing is changed');
    }

    public function test_a_changed_setting_reaches_the_server_and_the_game(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.settings.update'), $this->form([
            'boss_health_base' => 300,
            'skip_cost_per_zone' => 2500,
            'weight_epic' => 0.1,
        ]))->assertSessionHasNoErrors()->assertSessionHas('status');

        // The server's own values
        $this->assertSame(2500, config('boss_loot.skip_cost_per_zone'));
        $this->assertSame(0.1, config('loot.weights.epic'));

        // What the game is handed with its page
        $this->assertSame(
            ['bosses.health.base' => 300, 'itemProbabilities.epic' => 0.1],
            app(GameSettings::class)->forGame()
        );
        $this->get(route('play'))->assertSee('"bosses.health.base":300', false);

        $this->actingAs($admin)->get(route('admin.settings.edit'))->assertSee('3 settings differ');
        $this->assertDatabaseCount('settings', 3);
    }

    public function test_a_value_set_back_to_the_game_s_own_is_forgotten(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.settings.update'), $this->form(['rush_entry_fee' => 100]));
        $this->assertSame(100, config('boss_loot.rush.entry_fee'));

        $this->actingAs($admin)->post(route('admin.settings.update'), $this->form(['rush_entry_fee' => 5000]));
        $this->assertSame(5000, config('boss_loot.rush.entry_fee'));
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_everything_can_be_put_back_at_once(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.settings.update'), $this->form(['quiver_chance' => 1, 'pet_every' => 600]));
        $this->actingAs($admin)->post(route('admin.settings.reset'))->assertSessionHas('status');

        $this->assertSame(0.1, config('boss_loot.quiver.chance'));
        $this->assertSame([], app(GameSettings::class)->forGame());
        $this->assertDatabaseCount('settings', 0);
    }

    public function test_a_value_outside_its_range_is_refused(): void
    {
        $this->actingAs($this->admin())->post(route('admin.settings.update'), $this->form(['quiver_chance' => 3, 'boss_health_base' => 'lots']))
            ->assertSessionHasErrors(['quiver_chance', 'boss_health_base']);

        $this->assertDatabaseCount('settings', 0);
    }
}
