<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Raffle;
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
    public function test_the_first_run_seeds_the_demo_catalog(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => null]);

        $this->seed(DatabaseSeeder::class);

        $this->assertSame(12, Raffle::count());
        $this->assertSame(7, BankAccount::count());
    }

    public function test_a_later_boot_never_overwrites_catalog_data_edited_in_the_panel(): void
    {
        config(['rifas.admin.email' => 'boss@rifasrd.test', 'rifas.admin.password' => null]);
        $this->seed(DatabaseSeeder::class);

        Raffle::where('id', 35)->update(['title' => 'Editada por el operador', 'tickets_sold_count' => 777]);
        BankAccount::query()->update(['account_holder_name' => 'Titular Real']);
        Raffle::where('id', 31)->delete();

        $this->seed(DatabaseSeeder::class); // what every container boot does

        $this->assertSame('Editada por el operador', Raffle::find(35)->title);
        $this->assertSame(777, (int) Raffle::find(35)->tickets_sold_count);
        $this->assertSame('Titular Real', BankAccount::first()->account_holder_name);
        $this->assertNull(Raffle::find(31), 'a deleted raffle must not come back');
    }
}
