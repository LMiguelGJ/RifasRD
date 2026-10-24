<?php

namespace Database\Seeders;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('rifas.admin.email');
        $password = config('rifas.admin.password');

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Admin',
                'role' => 'admin',
                'password' => Hash::make($password ?: Str::random(24)),
            ],
        );

        // The configured admin always ends up as admin, even when the row
        // pre-dates the role column (migration default is 'operator').
        $changes = [];

        if ($user->role !== 'admin') {
            $changes['role'] = 'admin';
        }

        // Only rotate the password when one is explicitly configured, so a
        // reboot never locks the operator out of the panel.
        if ($password) {
            $changes['password'] = $password;
        }

        if ($changes !== []) {
            $user->update($changes);
        }

        // The demo catalog is first-boot data only. This seeder runs on EVERY
        // container boot, so without this marker each redeploy would overwrite
        // what the operator edited (titles, prices, tickets_sold_count...) and
        // bring back deleted raffles.
        if (Setting::find('demo_catalog_seeded') === null) {
            $this->call(CatalogSeeder::class);

            Setting::create(['key' => 'demo_catalog_seeded', 'value' => ['at' => now()->toIso8601String()]]);
        }
    }
}
