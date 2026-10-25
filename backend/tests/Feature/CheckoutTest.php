<?php

namespace Tests\Feature;

use App\Models\BankAccount;
use App\Models\Participant;
use App\Models\Raffle;
use App\Services\CaptchaService;
use App\Services\TurnstileVerifier;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private Participant $participant;

    private BankAccount $bank;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);

        $this->participant = Participant::create(['name' => 'Maria Perez', 'phone' => '18095551234']);
        $this->bank = BankAccount::first();
    }

    /** @return array<string, mixed> */
    private function payload(array $overrides = []): array
    {
        $captcha = app(CaptchaService::class)->issue();

        return array_merge([
            'customer_name' => 'Maria Perez',
            'phone' => '18095551234',
            'cedula' => '',
            'email' => null,
            'participant_id' => $this->participant->id,
            'bank_account_id' => $this->bank->id,
            'quantity' => 4,
            'voucher' => UploadedFile::fake()->create('voucher.pdf', 200, 'application/pdf'),
            'website' => '',
            'captcha_id' => $captcha['captcha_id'],
            'captcha_answer' => (string) $captcha['answer'],
        ], $overrides);
    }

    public function test_participant_is_reused_by_phone(): void
    {
        $first = $this->postJson('/api/participants', ['name' => 'Maria Perez', 'phone' => '18095551234', 'cedula' => null, 'email' => null]);
        $first->assertOk()->assertJsonPath('participant.id', $this->participant->id);

        $this->postJson('/api/participants', ['name' => 'Another', 'phone' => '18095551234', 'cedula' => null, 'email' => null])
            ->assertOk()
            ->assertJsonPath('participant.id', $this->participant->id);
    }

    public function test_checkout_with_combo_computes_total_server_side(): void
    {
        $combo = Raffle::find(20)->ticketCombos()->orderBy('sort_order')->skip(1)->first();

        $response = $this->postJson('/api/raffles/20/checkout', $this->payload([
            'ticket_combo_id' => $combo->id,
            'quantity' => null,
            'total_amount' => '0.01',
            'package_price' => '0.01',
        ]));

        $response->assertCreated()->assertJsonPath('status', 'pending_validation');
        $this->assertSame('300.00', $response->json('total_amount'), 'client-sent prices must be ignored');
        $this->assertSame([], $response->json('tickets'));
        $this->assertNotEmpty($response->json('customer_slug'));
        $this->assertNotEmpty($response->json('public_view_token'));
    }

    public function test_quantity_must_respect_raffle_bounds(): void
    {
        $this->postJson('/api/raffles/20/checkout', $this->payload(['quantity' => 1]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');
    }

    public function test_oversized_voucher_is_rejected(): void
    {
        $this->postJson('/api/raffles/20/checkout', $this->payload([
            'voucher' => UploadedFile::fake()->create('big.pdf', 11000, 'application/pdf'),
        ]))->assertStatus(422)->assertJsonValidationErrors('voucher');
    }

    public function test_honeypot_is_silently_rejected(): void
    {
        $this->postJson('/api/raffles/20/checkout', $this->payload(['website' => 'spam']))
            ->assertStatus(422)
            ->assertJsonMissingPath('errors');
    }

    public function test_captcha_is_required_when_turnstile_is_not_configured(): void
    {
        $this->postJson('/api/raffles/20/checkout', $this->payload(['captcha_id' => null, 'captcha_answer' => null]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('captcha_id');
    }

    public function test_wrong_captcha_answer_is_rejected(): void
    {
        $this->postJson('/api/raffles/20/checkout', $this->payload(['captcha_answer' => '99']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('captcha_id');
    }

    public function test_turnstile_token_is_verified_when_configured(): void
    {
        config(['services.turnstile.secret' => 'test-secret']);
        $fake = new class extends TurnstileVerifier
        {
            public bool $called = false;

            public function verify(string $token, string $remoteIp = ''): bool
            {
                $this->called = $token === 'valid-token';
                return $this->called;
            }
        };
        $this->app->instance(TurnstileVerifier::class, $fake);

        $this->postJson('/api/raffles/20/checkout', $this->payload(['turnstile_token' => 'valid-token']))
            ->assertCreated();

        $this->assertTrue($fake->called);
    }

    public function test_cannot_sell_more_than_available_stock(): void
    {
        Raffle::query()->where('id', 20)->update(['tickets_sold_count' => 99997]);

        $this->postJson('/api/raffles/20/checkout', $this->payload(['quantity' => 4]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('quantity');
    }

    public function test_cannot_sell_after_draw_date(): void
    {
        Raffle::query()->where('id', 20)->update(['draw_at' => now()->subHour()]);

        $this->postJson('/api/raffles/20/checkout', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('raffle');
    }

    public function test_checkout_rejects_inactive_bank_without_creating_an_order(): void
    {
        $this->bank->update(['is_active' => false]);

        $this->postJson('/api/raffles/20/checkout', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('bank_account_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_rejects_legacy_package_values_outside_purchase_rules(): void
    {
        $combo = Raffle::findOrFail(20)->ticketCombos()->firstOrFail();
        \Illuminate\Support\Facades\DB::table('ticket_combos')->where('id', $combo->id)->update([
            'quantity' => 0,
            'package_price' => '-1.00',
        ]);

        $this->postJson('/api/raffles/20/checkout', $this->payload([
            'ticket_combo_id' => $combo->id,
            'quantity' => null,
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('ticket_combo_id');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_lookup_by_phone_and_ticket_number(): void
    {
        $order = $this->postJson('/api/raffles/20/checkout', $this->payload())->json();

        $byPhone = $this->postJson('/api/raffles/20/checkout/lookup', ['phone' => '8095551234'])->assertOk();
        $this->assertCount(1, $byPhone->json('orders'));
        $this->assertSame($order['id'], $byPhone->json('orders.0.id'));
        $this->assertSame('Maria Perez', $byPhone->json('orders.0.customer_name'));
        $this->assertSame('18095551234', $byPhone->json('orders.0.phone'));

        $this->postJson('/api/raffles/20/checkout/lookup', ['ticket_number' => '99999'])
            ->assertOk()
            ->assertJsonCount(0, 'orders');
    }

    public function test_lookup_rejects_short_and_malformed_phone_inputs(): void
    {
        foreach (['1', '123456789', 'abc'] as $phone) {
            $this->postJson('/api/raffles/20/checkout/lookup', ['phone' => $phone])
                ->assertStatus(422)
                ->assertJsonValidationErrors('phone');
        }
    }

    public function test_ticket_number_lookup_does_not_disclose_customer_contact_details(): void
    {
        $order = $this->postJson('/api/raffles/20/checkout', $this->payload())->json();
        \App\Models\Ticket::create([
            'raffle_id' => 20,
            'order_id' => $order['id'],
            'participant_id' => $this->participant->id,
            'number' => '54321',
            'status' => 'validated',
        ]);

        $response = $this->postJson('/api/raffles/20/checkout/lookup', ['ticket_number' => '54321'])->assertOk();
        $response->assertJsonPath('orders.0.id', $order['id']);
        $this->assertArrayNotHasKey('phone', $response->json('orders.0'));
        $this->assertArrayNotHasKey('email', $response->json('orders.0'));
        $this->assertArrayNotHasKey('customer_name', $response->json('orders.0'));
    }

    public function test_public_order_link_and_404(): void
    {
        $order = $this->postJson('/api/raffles/20/checkout', $this->payload())->json();

        $this->getJson("/api/public/orders/{$order['customer_slug']}/{$order['public_view_token']}")
            ->assertOk()
            ->assertJsonPath('order_id', $order['id'])
            ->assertJsonPath('customer_name', 'Maria Perez')
            ->assertJsonPath('ticket_count', 0);

        $this->getJson("/api/public/orders/{$order['customer_slug']}/bad-token")->assertNotFound();
    }
}
