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

        $this->call(CatalogSeeder::class);
    }
}
