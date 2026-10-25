<?php

namespace Tests\Feature;

use App\Filament\Resources\BankAccountResource\Pages\ListBankAccounts;
use App\Filament\Resources\RaffleResource\Pages\ListRaffles;
use App\Filament\Resources\WinnerResource\Pages\ListWinners;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The seeded raffle photos live under /demo/rev (served by the SPA build), not in
 * Laravel's storage disk. Filament's ImageColumn prefixes non-URL values with the
 * disk URL (/storage/...), which 404s, so the list must hand it absolute URLs.
 */
class AdminRaffleImagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_raffle_list_points_each_photo_at_its_real_public_path(): void
    {
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));

        $html = Livewire::test(ListRaffles::class)->html();

        preg_match_all('/<img[^>]+src="([^"]*\.webp)"/', $html, $found);
        $sources = $found[1];

        $this->assertNotEmpty($sources, 'the list must render photos');
        $this->assertContains('http://localhost/demo/rev/cbr1000rr-repsol.webp', $sources);

        foreach ($sources as $src) {
            $this->assertStringNotContainsString('/storage/', $src, 'seeded photos are not in the storage disk');
        }
    }

    public function test_bank_logos_and_winner_portraits_are_shown_in_their_lists(): void
    {
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));

        foreach ([ListBankAccounts::class => '/demo/banks/', ListWinners::class => '/demo/winners/'] as $page => $folder) {
            $html = Livewire::test($page)->html();
            preg_match_all('/<img[^>]+src="([^"]*\.webp)"/', $html, $found);

            $this->assertNotEmpty($found[1], class_basename($page) . ' must render images');
            $this->assertStringContainsString('http://localhost' . $folder, $found[1][0]);
        }
    }

    public function test_a_raffle_without_a_photo_does_not_break_the_list(): void
    {
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
        \App\Models\Raffle::query()->update(['image_id' => null]);

        Livewire::test(ListRaffles::class)->assertSuccessful();
    }
}
