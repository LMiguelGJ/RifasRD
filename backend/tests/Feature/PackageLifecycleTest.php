<?php

namespace Tests\Feature;

use App\Models\Raffle;
use App\Models\TicketCombo;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PackageLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_package_model_rejects_non_integer_out_of_bounds_or_non_positive_values(): void
    {
        $raffle = Raffle::findOrFail(22);

        foreach ([
            ['quantity' => 0, 'package_price' => '10.00'],
            ['quantity' => 4.5, 'package_price' => '10.00'],
            ['quantity' => 10001, 'package_price' => '10.00'],
            ['quantity' => 4, 'package_price' => '-1.00'],
            ['quantity' => 4, 'package_price' => '0.00'],
        ] as $invalid) {
            try {
                TicketCombo::create($invalid + [
                    'raffle_id' => $raffle->id,
                    'sort_order' => 100,
                    'show_on_public' => true,
                ]);
                $this->fail('Invalid package data must be rejected by the model.');
            } catch (ValidationException $exception) {
                $this->assertArrayHasKey('ticketCombos', $exception->errors());
            }
        }

        $this->assertDatabaseMissing('ticket_combos', ['raffle_id' => $raffle->id, 'sort_order' => 100]);
    }
}
