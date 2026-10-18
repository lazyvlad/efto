<?php

namespace Tests\Feature;

use Tests\TestCase;

class ToolsTest extends TestCase
{
    public function test_the_tools_page_lists_every_tool(): void
    {
        $response = $this->get(route('tools'))->assertOk()->assertSee('Tools from I N P U T');
        foreach (config('tools') as $tool) {
            $response->assertSee($tool['name'])->assertSee(route($tool['route']));
        }
    }

    public function test_tools_is_in_the_menu_with_a_tab_for_each_tool(): void
    {
        $this->get(route('tools.audio-cutter'))->assertOk()
            ->assertSee('All tools')->assertSee('aria-current="page"', false);
    }

    public function test_the_audio_cutter_has_its_editor_and_encoders(): void
    {
        $this->get(route('tools.audio-cutter'))->assertOk()
            ->assertSee('id="wave"', false)->assertSee('id="output-wave"', false)
            ->assertSee('tools-files/audio-cutter/editor.js', false)
            ->assertSee('tools-files/audio-cutter/vendor/lame.min.js', false)
            ->assertSee('data-ogg-wasm=', false)
            ->assertSee('THIRD-PARTY-NOTICES.txt', false);

        foreach (['editor.js', 'vendor/lame.min.js', 'vendor/WasmMediaEncoder.min.js', 'vendor/ogg.wasm', 'licenses/mp3-encoder-LICENSE.txt', 'licenses/encoder-LICENSE.txt'] as $file) {
            $this->assertFileExists(public_path("tools-files/audio-cutter/$file"));
        }
        // The encoders exactly as released (lamejs 1.2.1, wasm-media-encoders 0.7.0)
        $this->assertSame('15d285e2587b3bdbfd18a68de6ce07cc074f7480a82c3815da2dc1c348ec6df4', hash_file('sha256', public_path('tools-files/audio-cutter/vendor/lame.min.js')));
        $this->assertSame('cd1f50349e58e650e33e3f0b850a785ed612c4abaa4756e520e50b2583cf07ed', hash_file('sha256', public_path('tools-files/audio-cutter/vendor/ogg.wasm')));
    }

    public function test_the_audio_cutter_offers_the_games_sounds(): void
    {
        $response = $this->get(route('tools.audio-cutter'))->assertOk()->assertSee('Sounds from I N P U T');
        $count = 0;
        foreach (config('tools.audio-cutter.samples') as $samples) {
            foreach ($samples as $sample) {
                $count++;
                $this->assertFileExists(public_path('game/assets/audio/'.$sample['file']), 'the built game has it');
                $response->assertSee('data-sample-url="'.asset('game/assets/audio/'.$sample['file']).'"', false);
            }
        }
        $this->assertGreaterThan(30, $count);
    }
}
