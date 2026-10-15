<?php

namespace Tests\Feature;

use App\Models\PerfSample;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerfTest extends TestCase
{
    use RefreshDatabase;

    private function body(array $sample = []): array
    {
        return [
            'session' => 'lx1-abc123',
            'version' => '3.0.13',
            'device' => ['gpu' => 'ANGLE (NVIDIA GeForce RTX 3070)', 'dpr' => 2, 'window' => '1440x900', 'nested' => ['no']],
            'sample' => $sample + ['fps' => 41.5, 'median' => 22.1, 'p95' => 48.2, 'hunter' => 6.3, 'thunderfury' => true, 'mode' => 'normal', 'deep' => ['no']],
        ];
    }

    public function test_the_game_s_measurements_are_kept_for_a_logged_in_player(): void
    {
        $user = User::factory()->create();

        $this->postJson(route('perf.store'), $this->body())->assertUnauthorized();
        $this->actingAs($user)->postJson(route('perf.store'), $this->body())->assertOk();

        $sample = PerfSample::sole();
        $this->assertSame($user->id, $sample->user_id);
        $this->assertSame(41.5, $sample->sample['fps']);
        $this->assertTrue($sample->sample['thunderfury']);
        // Only plain values are kept
        $this->assertArrayNotHasKey('deep', $sample->sample);
        $this->assertArrayNotHasKey('nested', $sample->device);

        $this->postJson(route('perf.store'), ['session' => 'bad session!', 'sample' => ['fps' => 1]])->assertStatus(422);
        $this->postJson(route('perf.store'), ['session' => 'ok-1', 'sample' => []])->assertStatus(422);
    }

    public function test_an_admin_reads_the_recordings(): void
    {
        $admin = User::factory()->create(['name' => 'Vlad']);
        $admin->forceFill(['is_admin' => true])->save();
        $this->actingAs($admin)->postJson(route('perf.store'), $this->body())->assertOk();
        $this->postJson(route('perf.store'), $this->body(['fps' => 18.0]))->assertOk();

        $this->get(route('admin.perf.index'))->assertOk()
            ->assertSee('NVIDIA GeForce RTX 3070')->assertSee('Vlad')->assertSee('29.8 · 18');
        $this->get(route('admin.perf.show', 'lx1-abc123'))->assertOk()->assertSee('Hunter ms')->assertSee('6.3');
        $this->get(route('admin.perf.show', 'nope'))->assertNotFound();

        $player = User::factory()->create();
        $this->actingAs($player)->get(route('admin.perf.index'))->assertNotFound();
    }

    public function test_debug_mode_asked_on_the_home_page_reaches_the_game_in_its_frame(): void
    {
        $this->get('/?debug=perf')->assertOk()->assertSee(e(route('play', ['embedded' => 1, 'debug' => 'perf'])), false);
        $this->get('/?debug=off')->assertOk()->assertSee(e(route('play', ['embedded' => 1, 'debug' => 'off'])), false);
        // Nothing else is passed on
        $this->get('/?debug=<x>')->assertOk()->assertSee(e(route('play', ['embedded' => 1])).'"', false);
    }
}
