<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Mail\OrderRejected;
use App\Mail\OrderValidated;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Services\ApproveOrderService;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Tests\TestCase;

class ApproveOrderTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
        Mail::fake();

        $this->order = Order::create([
            'raffle_id' => 20,
            'participant_id' => Participant::create(['name' => 'Maria Perez', 'phone' => '18095551234'])->id,
            'bank_account_id' => BankAccount::first()->id,
            'customer_name' => 'Maria Perez',
            'phone' => '18095551234',
            'email' => 'maria@example.com',
            'quantity' => 4,
            'total_amount' => '300.00',
            'status' => OrderStatus::PendingValidation,
            'customer_slug' => 'maria-perez',
            'public_view_token' => 'token-abc-123',
        ]);
    }

    public function test_approve_assigns_unique_numbers_and_skips_prizes(): void
    {
        app(ApproveOrderService::class)->approve($this->order);

        $this->order->refresh();
        $this->assertSame(OrderStatus::Validated, $this->order->status);
        $this->assertNotNull($this->order->validated_at);

        $tickets = Ticket::where('order_id', $this->order->id)->get();
        $this->assertCount(4, $tickets);
        $this->assertCount(4, $tickets->pluck('number')->unique());

        $prizeNumbers = $this->order->raffle->prizeNumbers()->pluck('number');
        foreach ($tickets as $ticket) {
            $this->assertMatchesRegularExpression('/^\d{5}$/', $ticket->number);
            $this->assertFalse($prizeNumbers->contains($ticket->number), 'prize numbers must never be sold');
        }

        $this->assertSame(66431, (int) $this->order->raffle->fresh()->tickets_sold_count);
        Mail::assertQueued(OrderValidated::class);
    }

    public function test_approve_twice_is_rejected(): void
    {
        app(ApproveOrderService::class)->approve($this->order);

        try {
            app(ApproveOrderService::class)->approve($this->order->refresh());
            $this->fail('Second approval must be rejected');
        } catch (RuntimeException) {
            // expected
        }

        $this->assertSame(4, Ticket::where('order_id', $this->order->id)->count());
        $this->assertSame(66431, (int) $this->order->raffle->fresh()->tickets_sold_count);
        Mail::assertQueued(OrderValidated::class, 1);
    }

    public function test_reject_cancels_without_tickets_and_notifies(): void
    {
        app(ApproveOrderService::class)->reject($this->order, 'Comprobante ilegible');

        $this->order->refresh();
        $this->assertSame(OrderStatus::Cancelled, $this->order->status);
        $this->assertSame(0, Ticket::where('order_id', $this->order->id)->count());
        Mail::assertQueued(OrderRejected::class);
    }

    public function test_rejected_order_cannot_be_approved_later(): void
    {
        app(ApproveOrderService::class)->reject($this->order);

        $this->expectException(RuntimeException::class);
        app(ApproveOrderService::class)->approve($this->order->refresh());
    }

    public function test_assigned_numbers_never_collide_with_existing_tickets(): void
    {
        $raffle = Raffle::findOrFail(20);
        $raffle->update(['tickets_sold_count' => 0]);
        Ticket::where('raffle_id', $raffle->id)->delete();
        $raffle->prizeNumbers()->delete();
        $raffle->update(['ticket_goal' => 10, 'digit_count' => 1]);
        $this->order->update(['quantity' => 4]);
        Ticket::create(['raffle_id' => 20, 'number' => '0', 'status' => 'validated']);

        app(ApproveOrderService::class)->approve($this->order);

        $numbers = Ticket::where('order_id', $this->order->id)->pluck('number');
        $this->assertFalse($numbers->contains('0'), 'already-sold numbers must be excluded');
        $this->assertCount(4, $numbers->unique());
    }

    public function test_approval_cannot_exceed_remaining_goal_after_another_pending_order_sells(): void
    {
        $raffle = Raffle::findOrFail(20);
        $raffle->update(['tickets_sold_count' => 0, 'ticket_goal' => 10, 'digit_count' => 2]);
        $raffle->prizeNumbers()->delete();
        $this->order->update(['quantity' => 6]);
        $second = $this->order->replicate();
        $second->public_view_token = 'token-abc-456';
        $second->save();

        app(ApproveOrderService::class)->approve($this->order);
        try {
            app(ApproveOrderService::class)->approve($second);
            $this->fail('Approval beyond the raffle goal must be rejected.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Not enough sellable capacity remains for this order.', $exception->getMessage());
        }

        $this->assertSame(OrderStatus::PendingValidation, $second->fresh()->status);
        $this->assertSame(6, Ticket::where('order_id', $this->order->id)->count());
        $this->assertSame(0, Ticket::where('order_id', $second->id)->count());
        $this->assertSame(6, (int) $raffle->fresh()->tickets_sold_count);
        Mail::assertQueued(OrderValidated::class, 1);
    }
}
