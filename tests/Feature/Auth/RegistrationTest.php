<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'correct-horse-battery',
            'password_confirmation' => 'correct-horse-battery',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('home', absolute: false));
    }

    public function test_short_passwords_are_rejected(): void
    {
        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'short-pass',
            'password_confirmation' => 'short-pass',
        ])->assertSessionHasErrors('password');

        $this->assertGuest();
    }

    public function test_passwords_built_from_the_name_or_email_are_rejected(): void
    {
        $this->post('/register', [
            'name' => 'Sylvanas Windrunner',
            'email' => 'banshee@example.com',
            'password' => 'windrunner-2026!',
            'password_confirmation' => 'windrunner-2026!',
        ])->assertSessionHasErrors('password');

        $this->assertGuest();
    }
}
