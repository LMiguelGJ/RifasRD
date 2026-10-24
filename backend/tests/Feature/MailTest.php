<?php

namespace Tests\Feature;

use App\Mail\OrderRejected;
use App\Mail\OrderValidated;
use App\Models\Order;
use App\Models\Ticket;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);

        $this->order = Order::create([
            'raffle_id' => 20,
            'customer_name' => 'Maria Perez',
            'phone' => '18095551234',
            'email' => 'maria@example.com',
            'quantity' => 2,
            'total_amount' => '150.00',
            'status' => 'validated',
            'customer_slug' => 'maria-perez',
            'public_view_token' => 'token-abc-123',
            'validated_at' => now(),
        ]);

        Ticket::create(['raffle_id' => 20, 'order_id' => $this->order->id, 'number' => '29041', 'status' => 'validated']);
        Ticket::create(['raffle_id' => 20, 'order_id' => $this->order->id, 'number' => '59284', 'status' => 'validated']);
    }

    public function test_validated_mail_renders_numbers_and_link(): void
    {
        $html = (new OrderValidated($this->order->load('tickets')))->render();

        $this->assertStringContainsString('Maria Perez', $html);
        $this->assertStringContainsString('29041', $html);
        $this->assertStringContainsString('59284', $html);
        $this->assertStringContainsString('150.00', $html);
        $this->assertStringContainsString('/maria-perez/token-abc-123', $html);
    }

    public function test_rejected_mail_renders_reason(): void
    {
        $html = (new OrderRejected($this->order, 'Comprobante ilegible'))->render();

        $this->assertStringContainsString('Maria Perez', $html);
        $this->assertStringContainsString('Comprobante ilegible', $html);
    }
}
