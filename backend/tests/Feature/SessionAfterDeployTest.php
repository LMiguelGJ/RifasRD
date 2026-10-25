<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Every container boot runs DatabaseSeeder. If it re-hashes an unchanged admin
 * password, every open session is invalidated by the deploy, and the resulting
 * "unauthenticated" redirect used to 500 because no `login` route existed.
 */
class SessionAfterDeployTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_again_with_the_same_password_keeps_the_stored_hash(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => 'Same-pass-123']);

        $this->seed(DatabaseSeeder::class);
        $hash = User::where('email', 'boss@rifasrd.test')->value('password');

        $this->seed(DatabaseSeeder::class); // the next container boot

        $this->assertSame($hash, User::where('email', 'boss@rifasrd.test')->value('password'), 'a reboot must not log anyone out');
    }

    public function test_a_changed_password_in_the_environment_is_still_applied(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => 'First-pass-123']);
        $this->seed(DatabaseSeeder::class);
        $hash = User::where('email', 'boss@rifasrd.test')->value('password');

        config(['rifas.admin.password' => 'Second-pass-456']);
        $this->seed(DatabaseSeeder::class);

        $this->assertNotSame($hash, User::where('email', 'boss@rifasrd.test')->value('password'));
    }

    public function test_an_unauthenticated_request_is_sent_to_the_panel_login_not_a_500(): void
    {
        Route::middleware(['web', 'auth'])->get('/_probe-auth', fn () => 'secret');

        $this->get('/_probe-auth')->assertRedirect('/admin/login');
    }

    public function test_the_panel_redirects_guests_to_its_login(): void
    {
        $this->get('/admin')->assertRedirect('/admin/login');
    }
}
