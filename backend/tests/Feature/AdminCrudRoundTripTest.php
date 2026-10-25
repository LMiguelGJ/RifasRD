<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Filament\Resources\BankAccountResource\Pages\ListBankAccounts;
use App\Filament\Resources\RaffleResource\Pages\EditRaffle;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\TicketCombo;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AdminCrudRoundTripTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_removing_a_purchased_package_hides_it_from_catalog_but_preserves_order_history(): void
    {
        $raffle = Raffle::findOrFail(20);
        $combo = TicketCombo::create([
            'raffle_id' => $raffle->id,
            'quantity' => 4,
            'package_price' => '300.00',
            'sort_order' => 100,
            'show_on_public' => true,
        ]);
        $order = Order::create([
            'raffle_id' => $raffle->id,
            'ticket_combo_id' => $combo->id,
            'participant_id' => Participant::create(['name' => 'Histórico', 'phone' => '18095550111'])->id,
            'bank_account_id' => BankAccount::firstOrFail()->id,
            'customer_name' => 'Histórico',
            'phone' => '18095550111',
            'quantity' => 4,
            'total_amount' => '300.00',
            'status' => OrderStatus::PendingValidation,
            'customer_slug' => 'historico',
            'public_view_token' => 'historical-package-token',
        ]);

        Livewire::test(EditRaffle::class, ['record' => $raffle->getKey()])
            ->fillForm(['ticketCombos' => []])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSoftDeleted('ticket_combos', ['id' => $combo->id]);
        $this->assertSame($combo->id, $order->fresh()->ticketCombo->id);
        $this->assertSame(4, $order->fresh()->ticketCombo->quantity);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'quantity' => 4,
            'total_amount' => '300.00',
        ]);
        $catalog = $this->getJson('/api/raffles/20')->assertOk()->json('ticket_combos');
        $this->assertNotContains($combo->id, array_column($catalog, 'id'));
    }

    public function test_admin_delete_actions_retire_raffles_and_banks_without_breaking_history(): void
    {
        $bank = BankAccount::firstOrFail();
        $order = Order::create([
            'raffle_id' => 20,
            'bank_account_id' => $bank->id,
            'participant_id' => Participant::create(['name' => 'Histórico', 'phone' => '18095550112'])->id,
            'customer_name' => 'Histórico',
            'phone' => '18095550112',
            'quantity' => 1,
            'total_amount' => '50.00',
            'status' => OrderStatus::PendingValidation,
            'customer_slug' => 'historico-banco',
            'public_view_token' => 'historical-bank-token',
        ]);

        Livewire::test(ListBankAccounts::class)
            ->callTableAction('delete', $bank)
            ->assertHasNoTableActionErrors();

        $this->assertSoftDeleted('bank_accounts', ['id' => $bank->id]);
        $this->assertSame($bank->id, $order->fresh()->bankAccount->id);
        $this->getJson('/api/bank-accounts')->assertOk()->assertJsonMissing(['id' => $bank->id]);

        $raffle = Raffle::findOrFail(20);
        Livewire::test(EditRaffle::class, ['record' => $raffle->getKey()])
            ->callAction('delete')
            ->assertHasNoActionErrors();

        $this->assertSoftDeleted('raffles', ['id' => $raffle->id]);
        $this->assertSame($raffle->id, $order->fresh()->raffle->id);
        $this->getJson('/api/raffles/20')->assertNotFound();
        $publicRaffleIds = array_column($this->getJson('/api/raffles')->assertOk()->json('data'), 'id');
        $this->assertNotContains(20, $publicRaffleIds);
    }
}
