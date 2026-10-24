<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_pre_existing_user_with_the_admin_email_is_promoted_to_admin(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => null]);
        User::factory()->create(['email' => 'boss@rifasrd.test', 'role' => 'operator']);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame('admin', User::where('email', 'boss@rifasrd.test')->value('role'));
        $this->assertSame(1, User::where('email', 'boss@rifasrd.test')->count());
    }

    public function test_fresh_database_creates_an_admin_with_the_configured_password(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => 'S3cret-pass-123']);

        $this->seed(DatabaseSeeder::class);

        $user = User::where('email', 'boss@rifasrd.test')->firstOrFail();
        $this->assertSame('admin', $user->role);
        $this->assertTrue(Hash::check('S3cret-pass-123', $user->password));
    }

    public function test_without_a_configured_password_an_existing_password_is_never_rotated(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => null]);
        $user = User::factory()->create(['email' => 'boss@rifasrd.test', 'password' => 'Keep-me-456']);
        $before = $user->password;

        $this->seed(DatabaseSeeder::class);

        $this->assertSame($before, $user->fresh()->password);
    }

    public function test_a_configured_password_rotates_the_existing_admin_password(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => 'New-pass-789']);
        User::factory()->create(['email' => 'boss@rifasrd.test', 'password' => 'Old-pass-000', 'role' => 'admin']);

        $this->seed(DatabaseSeeder::class);

        $this->assertTrue(Hash::check('New-pass-789', User::where('email', 'boss@rifasrd.test')->value('password')));
    }
}
