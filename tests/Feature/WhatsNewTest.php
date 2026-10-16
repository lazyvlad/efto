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
}
