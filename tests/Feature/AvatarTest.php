<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Avatar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
    }

    public function test_an_uploaded_image_is_stored_as_a_small_square(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('me.png', 900, 600)])
            ->assertRedirect(route('profile.edit'));

        $path = $user->refresh()->avatar;

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        [$width, $height, $type] = getimagesizefromstring(Storage::disk('public')->get($path));

        $this->assertSame([Avatar::SIZE, Avatar::SIZE, IMAGETYPE_WEBP], [$width, $height, $type]);
    }

    public function test_the_profile_page_script_gets_the_new_address_back(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('me.jpg', 512, 512)])
            ->assertOk();

        $this->assertSame($user->refresh()->avatarUrl(), $response->json('url'));
    }

    public function test_a_new_image_replaces_the_old_file(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('a.png', 200, 200)]);
        $first = $user->refresh()->avatar;

        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('b.png', 200, 200)]);

        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($user->refresh()->avatar);
    }

    public function test_files_that_are_not_images_are_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf')])
            ->assertSessionHasErrorsIn('avatar', 'avatar');

        $this->actingAs($user)
            ->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->createWithContent('fake.png', '<?php echo 1;')])
            ->assertSessionHasErrorsIn('avatar', 'avatar');

        $this->assertNull($user->refresh()->avatar);
    }

    public function test_the_image_can_be_removed(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('a.png', 200, 200)]);
        $path = $user->refresh()->avatar;

        $this->actingAs($user)->delete(route('profile.avatar.destroy'))->assertRedirect(route('profile.edit'));

        $this->assertNull($user->refresh()->avatar);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_guests_cannot_upload(): void
    {
        $this->post(route('profile.avatar.store'), ['avatar' => UploadedFile::fake()->image('a.png', 200, 200)])
            ->assertRedirect(route('login'));
    }
}
