<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Filament\Resources\BankAccountResource\Pages\ListBankAccounts;
use App\Filament\Resources\OrderResource\Pages\ListOrders;
use App\Filament\Resources\OrderResource\Pages\ViewOrder;
use App\Filament\Resources\ParticipantResource\Pages\ListParticipants;
use App\Filament\Resources\RaffleResource\Pages\CreateRaffle;
use App\Filament\Resources\RaffleResource\Pages\EditRaffle;
use App\Filament\Resources\RaffleResource\Pages\ListRaffles;
use App\Filament\Resources\TicketResource\Pages\ListTickets;
use App\Filament\Resources\WinnerResource\Pages\ListWinners;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Renders every admin list WITH data. Empty tables never run the column
 * closures, which is how an enum-state bug reached production unnoticed.
 */
class AdminResourcesTest extends TestCase
{
    use RefreshDatabase;

    private Order $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
        Mail::fake();

        $this->actingAs(User::factory()->create(['role' => 'admin']));

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

        Ticket::create(['raffle_id' => 20, 'order_id' => $this->order->id, 'number' => '12345', 'status' => 'validated']);
    }

    public function test_raffle_list_renders_every_seeded_raffle(): void
    {
        Livewire::test(ListRaffles::class)
            ->set('tableRecordsPerPage', 25)
            ->assertSuccessful()
            ->assertCanSeeTableRecords(Raffle::all());
    }

    public function test_order_list_renders_a_pending_order(): void
    {
        Livewire::test(ListOrders::class)
            ->assertSuccessful()
            ->assertCanSeeTableRecords([$this->order]);
    }

    public function test_order_view_page_renders(): void
    {
        Livewire::test(ViewOrder::class, ['record' => $this->order->getKey()])
            ->assertSuccessful();
    }

    public function test_the_other_lists_render_with_data(): void
    {
        Livewire::test(ListTickets::class)->assertSuccessful()->assertCanSeeTableRecords(Ticket::all());
        Livewire::test(ListParticipants::class)->assertSuccessful()->assertCanSeeTableRecords(Participant::all());
        Livewire::test(ListBankAccounts::class)->assertSuccessful()->assertCanSeeTableRecords(BankAccount::all());
        Livewire::test(ListWinners::class)->assertSuccessful();
    }

    public function test_approving_from_the_panel_validates_the_order_and_assigns_tickets(): void
    {
        $existing = Ticket::where('order_id', $this->order->id)->count();

        Livewire::test(ListOrders::class)
            ->callTableAction('approve', $this->order)
            ->assertHasNoTableActionErrors();

        $this->order->refresh();
        $this->assertSame(OrderStatus::Validated, $this->order->status);
        $this->assertSame($existing + 4, Ticket::where('order_id', $this->order->id)->count());
    }

    public function test_rejecting_from_the_panel_cancels_the_order(): void
    {
        Livewire::test(ListOrders::class)
            ->callTableAction('reject', $this->order)
            ->assertHasNoTableActionErrors();

        $this->assertSame(OrderStatus::Cancelled, $this->order->fresh()->status);
    }

    public function test_approve_action_is_hidden_once_an_order_is_no_longer_pending(): void
    {
        $this->order->update(['status' => OrderStatus::Validated]);

        Livewire::test(ListOrders::class)
            ->filterTable('status', OrderStatus::Validated->value)
            ->assertTableActionHidden('approve', $this->order)
            ->assertTableActionHidden('reject', $this->order);
    }

    public function test_raffle_edit_page_renders_and_saves(): void
    {
        $raffle = Raffle::findOrFail(35);
        $combos = $raffle->ticketCombos()->count();

        Livewire::test(EditRaffle::class, ['record' => $raffle->getKey()])
            ->assertSuccessful()
            ->fillForm(['title' => 'Ford Ranger Wildtrak X 2024 (editada)'])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame('Ford Ranger Wildtrak X 2024 (editada)', $raffle->fresh()->title);
        $this->assertSame($combos, $raffle->fresh()->ticketCombos()->count(), 'combos must survive an edit');
    }

    public function test_creating_a_raffle_with_a_photo_binds_the_image(): void
    {
        Storage::fake('public');

        Livewire::test(CreateRaffle::class)
            ->fillForm([
                'title' => 'Rifa con foto',
                'category_id' => 1,
                'banner' => UploadedFile::fake()->image('foto.jpg', 600, 400),
                'ticket_price' => 50,
                'ticket_goal' => 1000,
                'min_tickets_per_user' => 1,
                'max_tickets_per_user' => 100,
                'status' => 'active',
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $raffle = Raffle::where('title', 'Rifa con foto')->firstOrFail();
        $this->assertNotNull($raffle->image_id, 'the uploaded photo must be bound to the raffle');
        $this->assertStringStartsWith('/storage/raffles/', $raffle->image->url);
    }

    public function test_a_draw_date_below_80_percent_sold_is_a_form_error_not_a_crash(): void
    {
        $raffle = Raffle::findOrFail(35); // 14% sold, no draw date

        Livewire::test(EditRaffle::class, ['record' => $raffle->getKey()])
            ->fillForm(['draw_at' => now()->addDays(3)->toDateTimeString()])
            ->call('save')
            ->assertHasFormErrors(['draw_at']);

        $this->assertNull($raffle->fresh()->draw_at);
    }
}
