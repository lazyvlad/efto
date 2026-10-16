<?php

namespace Tests\Feature;

use App\Models\PerfSample;
use App\Models\User;
use App\Support\PerfDevices;
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

    public function test_devices_are_named_as_people_know_them(): void
    {
        $this->assertSame('NVIDIA GeForce RTX 5080', PerfDevices::gpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002C02) Direct3D11 vs_5_0 ps_5_0, D3D11)'));
        $this->assertSame('Intel(R) UHD Graphics 620', PerfDevices::gpu('ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)'));
        $this->assertSame('Apple M2', PerfDevices::gpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'));
        $this->assertSame('Adreno (TM) 740', PerfDevices::gpu('Adreno (TM) 740'));
        $this->assertSame('Graphics card not told', PerfDevices::gpu(null));

        $this->assertSame('Windows · Chrome', PerfDevices::system('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'));
        $this->assertSame('iPhone · Safari', PerfDevices::system('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1'));
        $this->assertSame('Android · Chrome', PerfDevices::system('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36'));
        $this->assertSame('Mac · Firefox', PerfDevices::system('Mozilla/5.0 (Macintosh; Intel Mac OS X 15.0; rv:140.0) Gecko/20100101 Firefox/140.0'));
    }

    public function test_players_games_are_gathered_by_device(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();
        $laptop = ['gpu' => 'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'userAgent' => 'Mozilla/5.0 (Windows NT 10.0) Chrome/155.0 Safari/537.36', 'window' => '1366x657'];
        foreach ([['a-1', 42.0, 4], ['a-1', 38.0, 6], ['b-2', 60.0, 0]] as [$session, $fps, $slow]) {
            PerfSample::create(['session' => $session, 'device' => $laptop, 'sample' => ['source' => 'sampled', 'fps' => $fps, 'seconds' => 30, 'over33' => $slow]]);
        }

        $devices = PerfDevices::summary(PerfSample::all());
        $this->assertCount(1, $devices);
        $this->assertSame('Intel(R) UHD Graphics 620', $devices[0]['gpu']);
        $this->assertSame('Windows · Chrome', $devices[0]['system']);
        $this->assertSame(2, $devices[0]['games']);
        $this->assertSame(1.5, $devices[0]['minutes']);
        $this->assertSame(46.7, $devices[0]['fps']);
        $this->assertSame(38.0, $devices[0]['lowFps']);
        $this->assertSame(6.7, $devices[0]['slowPerMinute']);
        $this->assertSame(67, $devices[0]['under50']);

        $this->actingAs($admin)->get(route('admin.perf.index', ['source' => 'sampled']))->assertOk()
            ->assertSee('By device')->assertSee('Intel(R) UHD Graphics 620')->assertSee('46.7 · 38');
        // Only debug mode's: no device yet (the sessions below list every session, marked)
        $this->get(route('admin.perf.index', ['source' => 'debug']))->assertOk()->assertSee('Nothing recorded yet.')->assertSee('sampled');
    }

    public function test_the_game_is_told_what_share_of_games_to_sample_and_old_samples_go(): void
    {
        config(['game.perf_share' => 0.05]);
        $this->get(route('play'))->assertSee('"perfShare":0.05', false);

        PerfSample::create(['session' => 'old-1', 'device' => [], 'sample' => ['fps' => 60]]);
        PerfSample::query()->update(['created_at' => now()->subDays(40)]);
        PerfSample::create(['session' => 'new-1', 'device' => [], 'sample' => ['fps' => 60]]);
        $this->artisan('input:prune-perf')->assertSuccessful();
        $this->assertSame(['new-1'], PerfSample::pluck('session')->all());
    }

    public function test_debug_mode_asked_on_the_home_page_reaches_the_game_in_its_frame(): void
    {
        $this->get('/?debug=perf')->assertOk()->assertSee(e(route('play', ['embedded' => 1, 'debug' => 'perf'])), false);
        $this->get('/?debug=off')->assertOk()->assertSee(e(route('play', ['embedded' => 1, 'debug' => 'off'])), false);
        // Nothing else is passed on
        $this->get('/?debug=<x>')->assertOk()->assertSee(e(route('play', ['embedded' => 1])).'"', false);
    }
}
