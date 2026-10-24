<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = env('ADMIN_PASSWORD');

        $user = User::firstOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@rifasrd.local')],
            [
                'name' => 'Admin',
                'role' => 'admin',
                'password' => Hash::make($password ?: Str::random(24)),
            ],
        );

        // Only rotate the password when one is explicitly configured, so a
        // reboot never locks the operator out of the panel.
        if ($password) {
            $user->update(['password' => Hash::make($password)]);
        }

        $this->call(CatalogSeeder::class);
    }
}
