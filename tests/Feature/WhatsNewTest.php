<?php

namespace Tests\Feature;

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsNewTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    public function test_the_page_works_with_nothing_posted(): void
    {
        $this->get(route('whats-new'))->assertOk()->assertSee('Nothing posted yet');
    }

    public function test_players_see_published_posts_newest_first_and_not_drafts(): void
    {
        NewsPost::create(['title' => 'Older news', 'body' => 'old', 'published_at' => now()->subDays(2)]);
        NewsPost::create(['title' => 'I N P U T 3.0', 'version' => '3.0', 'body' => "## Fights\n- **Haste** is yours", 'published_at' => now()->subDay()]);
        NewsPost::create(['title' => 'Secret draft', 'body' => 'not yet']);

        $this->get(route('whats-new'))
            ->assertOk()
            ->assertSeeInOrder(['I N P U T 3.0', 'Version 3.0', 'Older news'])
            ->assertSee('<h2>Fights</h2>', false)
            ->assertSee('<strong>Haste</strong>', false)
            ->assertDontSee('Secret draft');
    }

    public function test_html_written_in_a_post_is_shown_as_text(): void
    {
        NewsPost::create(['title' => 'Careful', 'body' => "<script>alert(1)</script>\n\n[click](javascript:alert(1))", 'published_at' => now()]);

        $this->get(route('whats-new'))
            ->assertOk()
            ->assertDontSee('<script>alert(1)</script>', false)
            ->assertDontSee('href="javascript:', false);
    }

    public function test_an_admin_writes_a_draft_then_publishes_it(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin);

        $this->post(route('admin.news.store'), ['title' => 'Coming soon', 'version' => '3.1', 'body' => 'Hello', 'publish' => '0'])
            ->assertRedirect();
        $post = NewsPost::sole();
        $this->assertNull($post->published_at);
        $this->assertSame($admin->id, $post->user_id);
        $this->get(route('whats-new'))->assertDontSee('Coming soon');

        $this->put(route('admin.news.update', $post), ['title' => 'Out now', 'version' => '3.1', 'body' => 'Hello', 'publish' => '1'])
            ->assertRedirect(route('admin.news.edit', $post));
        $published = $post->fresh()->published_at;
        $this->assertNotNull($published);
        $this->get(route('whats-new'))->assertSee('Out now');

        // Saving again keeps the date it first went up
        $this->travel(2)->days();
        $this->put(route('admin.news.update', $post), ['title' => 'Out now', 'body' => 'Hello again', 'publish' => '1']);
        $this->assertTrue($published->equalTo($post->fresh()->published_at));

        $this->get(route('admin.news.index'))->assertOk()->assertSee('Out now');
        $this->get(route('admin.news.edit', $post))->assertOk()->assertSee('Hello again');

        $this->delete(route('admin.news.destroy', $post))->assertRedirect(route('admin.news.index'));
        $this->assertSame(0, NewsPost::count());
    }

    public function test_only_admins_write_posts(): void
    {
        $player = User::factory()->create();

        $this->get(route('admin.news.index'))->assertRedirect(route('login'));
        $this->actingAs($player)->get(route('admin.news.index'))->assertNotFound();
        $this->actingAs($player)->post(route('admin.news.store'), ['title' => 'x', 'body' => 'y', 'publish' => '1'])->assertNotFound();
        $this->assertSame(0, NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_4_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_16_090000_publish_whats_new_3_4_0.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.4.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Creatures, melee, loot from the bosses and the Frost Trap', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('The Frost Trap')->assertSee('Set pieces only drop from bosses.');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_5_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_16_110000_publish_whats_new_3_5_0.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.5.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('A fresh start, new boss attacks and more room to fight', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('A fresh start')->assertSee('Stitches');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_5_4_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_16_120000_publish_whats_new_3_5_4.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.5.4', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Longer zones and livelier creatures', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Longer zones')->assertSee('Creatures give experience');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_5_6_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_16_130000_publish_whats_new_3_5_6.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.5.6', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Faster blades, and a weapon for every style', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Faster swings')->assertSee('swing timer');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_5_8_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_16_150000_publish_whats_new_3_5_8.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.5.8', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Your games on Discord, told in full', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Your games on Discord')->assertSee('Your name on your games');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_7_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_17_150000_publish_whats_new_3_7_0.php');

        // A draft of it already there is published as written, not added again
        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.7.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('The bosses come alive', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Every zone has its own creatures')->assertSee('Your hunter on the move');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_8_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_17_180000_publish_whats_new_3_8_0.php');

        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.8.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Spells, steps and safer bags', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Your hunter in a fight')->assertSee('Your bags and your gear');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_9_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_17_200000_publish_whats_new_3_9_0.php');

        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.9.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Your pet bites back, and the vendor sells materials', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Your pet bites back')->assertSee('New recipes');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }

    public function test_the_deploy_publishes_the_3_10_0_post_once(): void
    {
        $this->app->instance('publish-whats-new', true);
        $migration = require base_path('database/migrations/2026_10_17_220000_publish_whats_new_3_10_0.php');

        \App\Models\NewsPost::create(['title' => 'Draft', 'version' => '3.10.0', 'body' => 'Draft text']);
        $migration->up();
        $migration->up();

        $post = \App\Models\NewsPost::sole();
        $this->assertTrue($post->isPublished());
        $this->assertSame('Your pet, in the game, and the shots on 1, 2, 3', $post->title);
        $this->get(route('whats-new'))->assertOk()->assertSee('Your pet, in the game')->assertSee('Two layouts of keys');

        $migration->down();
        $this->assertSame(0, \App\Models\NewsPost::count());
    }
}
