<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Ticket;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TicketIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_ticket_cannot_be_reassigned_away_from_its_orders_raffle(): void
    {
        $this->seed(CatalogSeeder::class);
        $order = Order::create([
            'raffle_id' => 20,
            'participant_id' => Participant::create(['name' => 'Cliente', 'phone' => '18095550123'])->id,
            'bank_account_id' => BankAccount::firstOrFail()->id,
            'customer_name' => 'Cliente',
            'phone' => '18095550123',
            'quantity' => 1,
            'total_amount' => '50.00',
            'status' => OrderStatus::PendingValidation,
            'customer_slug' => 'cliente',
            'public_view_token' => 'ticket-integrity-token',
        ]);
        $ticket = Ticket::create([
            'raffle_id' => 20,
            'order_id' => $order->id,
            'number' => '54321',
            'status' => 'validated',
        ]);

        try {
            $ticket->update(['raffle_id' => 35]);
            $this->fail('A ticket must remain attached to its order raffle.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('raffle_id', $exception->errors());
        }

        $this->assertSame(20, (int) $ticket->fresh()->raffle_id);
        $ticket->refresh()->update(['status' => 'sold']);
        $this->assertSame('sold', $ticket->fresh()->status);
    }
}
