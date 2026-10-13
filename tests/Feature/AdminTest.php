<?php

namespace Tests\Feature;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use App\Support\BossLoot;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    private function playedGame(?User $user = null, array $with = []): Game
    {
        return Game::create($with + [
            'token' => fake()->uuid(),
            'user_id' => $user?->id,
            'name' => $user?->name ?? 'GuestMurloc',
            'faction' => 'horde',
            'status' => Game::FINISHED,
            'score' => 900,
            'level' => 4,
            'game_time' => 95,
            'started_at' => now()->subMinutes(5),
            'ended_at' => now(),
        ]);
    }

    public function test_the_admin_section_does_not_exist_for_anyone_else(): void
    {
        $player = User::factory()->create();

        $this->get(route('admin.dashboard'))->assertRedirect(route('login'));

        foreach (['admin.dashboard', 'admin.users.index', 'admin.games.index'] as $page) {
            $this->actingAs($player)->get(route($page))->assertNotFound();
        }
        $this->actingAs($player)->post(route('admin.users.admin', $player))->assertNotFound();
        $this->assertFalse($player->fresh()->is_admin);

        $this->actingAs($player)->get(route('highscores'))->assertDontSee(route('admin.dashboard'), false);
    }

    public function test_an_admin_sees_the_overview_and_the_way_in(): void
    {
        $admin = $this->admin();
        $this->playedGame();
        $this->playedGame($admin);

        $this->actingAs($admin)->get(route('highscores'))->assertSee(route('admin.dashboard'), false);

        $this->actingAs($admin)->get(route('admin.dashboard'))
            ->assertOk()
            ->assertSee('Latest games')
            ->assertSee('GuestMurloc')
            ->assertSee($admin->email);
    }

    public function test_accounts_can_be_searched_and_narrowed(): void
    {
        $admin = $this->admin();
        User::factory()->create(['name' => 'Thrall', 'email' => 'thrall@example.com']);
        User::factory()->unverified()->create(['name' => 'Jaina']);

        $this->actingAs($admin)->get(route('admin.users.index'))->assertOk()->assertSee('Thrall')->assertSee('Jaina');
        $this->actingAs($admin)->get(route('admin.users.index', ['q' => 'thrall@']))->assertSee('Thrall')->assertDontSee('Jaina');
        $this->actingAs($admin)->get(route('admin.users.index', ['show' => 'unactivated']))->assertSee('Jaina')->assertDontSee('Thrall');
    }

    public function test_an_account_page_shows_what_the_player_has(): void
    {
        $player = User::factory()->create(['name' => 'Thrall']);
        $player->forceFill(['coins' => 32005])->save();
        $this->playedGame($player);

        $this->actingAs($this->admin())->get(route('admin.users.show', $player))
            ->assertOk()
            ->assertSee('Thrall')
            ->assertSee('3g 20s 5c')
            ->assertSee('played out');
    }

    public function test_an_admin_can_activate_an_account_and_set_its_purse(): void
    {
        $admin = $this->admin();
        $player = User::factory()->unverified()->create();

        $this->actingAs($admin)->post(route('admin.users.activate', $player))->assertSessionHas('status');
        $this->actingAs($admin)->post(route('admin.users.coins', $player), ['gold' => 2, 'silver' => 30, 'copper' => 4])
            ->assertSessionHas('status');

        $this->assertTrue($player->fresh()->canUseRewards());
        $this->assertSame(23004, $player->fresh()->coins);
    }

    public function test_an_admin_can_open_zones_for_a_player_and_take_them_back(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();
        // The first boss the player beat themselves
        BossDrop::create(['user_id' => $player->id, 'boss_id' => 'sarkoth', 'item_id' => 'x', 'rarity' => 'rare', 'dropped_at' => now()]);

        $this->actingAs($admin)->get(route('admin.users.show', $player))->assertOk()->assertSee('Unlock content')->assertSee('Horde zones');

        // Six bosses counted as beaten opens zone 7
        $this->actingAs($admin)->post(route('admin.users.zones', $player), ['faction' => 'horde', 'bosses' => 6])->assertSessionHas('status');
        $this->assertSame(7, BossLoot::unlockedZone($player, 'horde'));
        $this->assertSame(1, BossLoot::unlockedZone($player, 'alliance'));
        // The boss already beaten was left as it was
        $this->assertSame(1, $player->bossDrops()->where('boss_id', 'sarkoth')->count());
        $this->assertSame(5, $player->bossDrops()->where('granted', true)->count());

        // The game hands the player what was opened
        $this->actingAs($player)->get(route('play'))->assertSee('"horde":7', false);

        // Taken back, what the player earned stays
        $this->actingAs($admin)->post(route('admin.users.zones.lock', $player), ['faction' => 'horde']);
        $this->assertSame(2, BossLoot::unlockedZone($player, 'horde'));
        $this->assertSame(1, $player->bossDrops()->count());

        $this->actingAs($admin)->post(route('admin.users.zones', $player), ['faction' => 'horde', 'bosses' => 11])->assertSessionHasErrors('bosses');
        $this->actingAs($admin)->post(route('admin.users.zones', $player), ['faction' => 'scourge', 'bosses' => 2])->assertSessionHasErrors('faction');
    }

    public function test_an_admin_can_give_sets_and_the_quiver_and_take_them_back(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();
        // One piece the player caught
        $game = $this->playedGame($player);
        $game->drops()->create(['item_id' => 'giantstalker-helmet', 'chunk' => 0, 'at_seconds' => 3, 'claimed_at' => now()]);

        $this->actingAs($admin)->post(route('admin.users.set', $player), ['set' => 'giantstalker'])->assertSessionHas('status');
        $player->refresh();
        $this->assertCount(8, $player->setPieces());
        $this->assertCount(7, $player->granted_pieces);

        $this->actingAs($admin)->post(route('admin.users.quiver', $player));
        $this->assertTrue($player->fresh()->quiver);

        $this->actingAs($player->fresh())->get(route('play'))->assertSee('giantstalker-boots', false)->assertSee('"quiver":true', false);

        // Taken back: the piece that was caught is still theirs
        $this->actingAs($admin)->post(route('admin.users.set', $player), ['set' => 'giantstalker', 'take' => 1]);
        $this->actingAs($admin)->post(route('admin.users.quiver', $player));
        $player->refresh();
        $this->assertSame(['giantstalker-helmet'], $player->setPieces());
        $this->assertFalse($player->quiver);

        $this->actingAs($admin)->post(route('admin.users.set', $player), ['set' => 'made-up'])->assertSessionHasErrors('set');
    }

    public function test_everything_can_be_unlocked_at_once(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.users.unlock-all', $player))->assertSessionHas('status');

        $player->refresh();
        $this->assertSame(10, BossLoot::unlockedZone($player, 'alliance'));
        $this->assertSame(10, BossLoot::unlockedZone($player, 'horde'));
        $this->assertSame(20, $player->bossDrops()->distinct()->count('boss_id'));
        $this->assertEqualsCanonicalizing(config('loot.items.set_piece'), $player->setPieces());
        $this->assertTrue($player->quiver);
    }

    public function test_unlocking_is_for_admins_only(): void
    {
        $player = User::factory()->create();

        foreach (['admin.users.unlock-all', 'admin.users.quiver', 'admin.users.zones', 'admin.users.set'] as $action) {
            $this->actingAs($player)->post(route($action, $player), ['faction' => 'horde', 'bosses' => 9, 'set' => 'giantstalker'])->assertNotFound();
        }

        $this->assertFalse($player->fresh()->quiver);
        $this->assertSame(0, $player->bossDrops()->count());
    }

    public function test_a_blocked_account_is_logged_out_and_cannot_log_back_in(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.users.block', $player));
        $this->assertTrue($player->fresh()->isBlocked());

        // Where it is logged in already
        $this->actingAs($player->fresh())->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->assertGuest();

        // And at the door
        $this->post('/login', ['email' => $player->email, 'password' => 'password']);
        $this->get(route('profile.edit'))->assertRedirect(route('login'));
        $this->assertGuest();

        $this->actingAs($admin)->post(route('admin.users.unblock', $player));
        $this->actingAs($player->fresh())->get(route('profile.edit'))->assertOk();
    }

    public function test_an_admin_cannot_turn_on_their_own_account(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.users.block', $admin))->assertSessionHasErrors('user');
        $this->actingAs($admin)->post(route('admin.users.admin', $admin))->assertSessionHasErrors('user');
        $this->actingAs($admin)->delete(route('admin.users.destroy', $admin), ['confirm' => $admin->email])->assertSessionHasErrors('user');

        $admin->refresh();
        $this->assertTrue($admin->is_admin);
        $this->assertFalse($admin->isBlocked());
    }

    public function test_admins_are_made_and_unmade(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();

        $this->actingAs($admin)->post(route('admin.users.admin', $player));
        $this->assertTrue($player->fresh()->is_admin);

        $this->artisan('input:admin', ['email' => $player->email, '--remove' => true])->assertSuccessful();
        $this->assertFalse($player->fresh()->is_admin);

        $this->artisan('input:admin', ['email' => 'nobody@example.com'])->assertFailed();
    }

    public function test_deleting_an_account_needs_its_email_typed_and_keeps_its_games(): void
    {
        $admin = $this->admin();
        $player = User::factory()->create();
        $game = $this->playedGame($player);

        $this->actingAs($admin)->delete(route('admin.users.destroy', $player), ['confirm' => 'wrong'])->assertSessionHasErrors('confirm');
        $this->assertNotNull($player->fresh());

        $this->actingAs($admin)->delete(route('admin.users.destroy', $player), ['confirm' => $player->email])
            ->assertRedirect(route('admin.users.index'));

        $this->assertNull($player->fresh());
        $this->assertNull($game->fresh()->user_id);
    }

    public function test_a_score_can_be_taken_off_the_leaderboard(): void
    {
        $game = $this->playedGame();
        $score = Score::create(['game_id' => $game->id, 'name' => $game->name, 'score' => 900, 'level' => 4]);

        $this->actingAs($this->admin())->get(route('admin.games.index', ['show' => 'leaderboard']))
            ->assertOk()->assertSee('Off the leaderboard');

        $this->actingAs($this->admin())->delete(route('admin.scores.destroy', $score))->assertSessionHas('status');

        $this->assertNull($score->fresh());
        $this->assertNotNull($game->fresh());
    }
}
