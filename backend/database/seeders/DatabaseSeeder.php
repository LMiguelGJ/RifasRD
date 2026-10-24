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
        User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@rifasrd.local')],
            [
                'name' => 'Admin',
                'password' => Hash::make(env('ADMIN_PASSWORD') ?: Str::random(24)),
            ],
        );

        $this->call(CatalogSeeder::class);
    }
}
