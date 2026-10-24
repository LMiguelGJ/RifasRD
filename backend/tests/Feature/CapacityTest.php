<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Participant;
use App\Models\PrizeNumber;
use App\Models\Raffle;
use App\Services\CaptchaService;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CapacityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    private function tinyRaffle(int $prizes): Raffle
    {
        $raffle = Raffle::create([
            'category_id' => 1, 'title' => 'Tiny', 'ticket_goal' => 100, 'ticket_price' => '10.00',
            'min_tickets_per_user' => 1, 'max_tickets_per_user' => 100, 'digit_count' => 2,
            'status' => 'active', 'tickets_sold_count' => 0,
        ]);

        for ($i = 0; $i < $prizes; $i++) {
            PrizeNumber::create(['raffle_id' => $raffle->id, 'number' => str_pad((string) $i, 2, '0', STR_PAD_LEFT), 'status' => 'available']);
        }

        return $raffle;
    }

    /** @return array<string, mixed> */
    private function checkoutPayload(int $quantity): array
    {
        $captcha = app(CaptchaService::class)->issue();

        return [
            'customer_name' => 'Maria Perez', 'phone' => '18095551234', 'cedula' => '', 'email' => null,
            'participant_id' => Participant::create(['name' => 'Maria Perez', 'phone' => '18095551234'])->id,
            'bank_account_id' => BankAccount::first()->id,
            'quantity' => $quantity,
            'voucher' => UploadedFile::fake()->create('v.pdf', 100, 'application/pdf'),
            'website' => '', 'captcha_id' => $captcha['captcha_id'], 'captcha_answer' => (string) $captcha['answer'],
        ];
    }

    public function test_available_tickets_are_capped_by_the_number_pool_minus_prize_numbers(): void
    {
        $raffle = $this->tinyRaffle(prizes: 50);

        $this->assertSame(50, $raffle->fresh()->tickets_available_count);
        $this->getJson("/api/raffles/{$raffle->id}")->assertOk()->assertJsonPath('tickets_available_count', 50);
    }

    public function test_checkout_rejects_more_tickets_than_free_numbers_exist(): void
    {
        $raffle = $this->tinyRaffle(prizes: 50);

        $this->postJson("/api/raffles/{$raffle->id}/checkout", $this->checkoutPayload(51))
            ->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->postJson("/api/raffles/{$raffle->id}/checkout", $this->checkoutPayload(50))->assertCreated();
    }

    public function test_a_raffle_without_prize_numbers_keeps_goal_minus_sold(): void
    {
        $raffle = Raffle::findOrFail(22);

        $this->assertSame($raffle->ticket_goal - $raffle->tickets_sold_count, $raffle->tickets_available_count);
    }

    public function test_listing_keeps_the_availability_field_for_every_raffle(): void
    {
        $data = $this->getJson('/api/raffles?per_page=50')->assertOk()->json('data');

        foreach ($data as $raffle) {
            $this->assertIsInt($raffle['tickets_available_count']);
            $this->assertGreaterThanOrEqual(0, $raffle['tickets_available_count']);
        }
    }
}
