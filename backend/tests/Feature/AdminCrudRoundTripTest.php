<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Filament\Resources\BankAccountResource\Pages\ListBankAccounts;
use App\Filament\Resources\RaffleResource\Pages\CreateRaffle;
use App\Filament\Resources\RaffleResource\Pages\EditRaffle;
use App\Filament\Resources\TicketResource\Pages\EditTicket;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\Ticket;
use App\Models\TicketCombo;
use App\Models\User;
use App\Services\CaptchaService;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
        Storage::fake('local');
        Storage::fake('public');
    }

    /** @return array<string, mixed> */
    private function raffleData(string $title): array
    {
        return [
            'title' => $title,
            'category_id' => Raffle::findOrFail(20)->category_id,
            'ticket_price' => 75,
            'ticket_goal' => 1000,
            'min_tickets_per_user' => 2,
            'max_tickets_per_user' => 10,
            'status' => 'active',
            'draw_at' => null,
        ];
    }

    /** @return array<string, mixed> */
    private function combo(int $quantity, string $price, bool $public = true): array
    {
        return ['quantity' => $quantity, 'package_price' => $price, 'show_on_public' => $public, 'accent' => 'blue'];
    }

    /** @return array<string, mixed> */
    private function checkoutPayload(array $overrides = []): array
    {
        $participant = Participant::firstOrCreate(
            ['phone' => '18095550199'],
            ['name' => 'Prueba CRUD'],
        );
        $captcha = app(CaptchaService::class)->issue();

        return array_merge([
            'customer_name' => 'Prueba CRUD',
            'phone' => $participant->phone,
            'participant_id' => $participant->id,
            'bank_account_id' => BankAccount::firstOrFail()->id,
            'quantity' => 4,
            'voucher' => UploadedFile::fake()->create('voucher.pdf', 1, 'application/pdf'),
            'captcha_id' => $captcha['captcha_id'],
            'captcha_answer' => (string) $captcha['answer'],
        ], $overrides);
    }

    /** @param array<string, mixed> $order */
    private function publicOrder(array $order)
    {
        return $this->getJson('/api/public/orders/' . $order['customer_slug'] . '/' . $order['public_view_token']);
    }

    public function test_create_edit_reorder_remove_checkout_and_historical_order_round_trip(): void
    {
        Livewire::test(CreateRaffle::class)
            ->fillForm($this->raffleData('CRUD package lifecycle') + ['ticketCombos' => [$this->combo(4, '300.00')]])
            ->call('create')
            ->assertHasNoFormErrors();

        $raffle = Raffle::where('title', 'CRUD package lifecycle')->firstOrFail();
        $catalog = $this->getJson('/api/raffles/' . $raffle->id)->assertOk()->json();
        $this->assertCount(1, $catalog['ticket_combos']);
        $firstPackageId = $catalog['ticket_combos'][0]['id'];
        $originalOrder = $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload([
            'ticket_combo_id' => $firstPackageId,
        ]))->assertCreated()->assertJsonPath('total_amount', '300.00')->json();
        $originalPublicOrder = $this->publicOrder($originalOrder)->assertOk()->json();

        $edit = Livewire::test(EditRaffle::class, ['record' => $raffle->id]);
        $state = $edit->get('data.ticketCombos');
        $firstKey = array_key_first($state);
        $state[$firstKey] = $this->combo(5, '450.00', false);
        $state['new-package'] = $this->combo(6, '500.00');
        $edit->fillForm(['ticket_price' => 100, 'ticketCombos' => $state])
            ->call('save')
            ->assertHasNoFormErrors();

        $catalog = $this->getJson('/api/raffles/' . $raffle->id)->assertOk()->json();
        $firstPackage = collect($catalog['ticket_combos'])->firstWhere('id', $firstPackageId);
        $this->assertSame('100.00', $catalog['ticket_price']);
        $this->assertSame(5, $firstPackage['quantity']);
        $this->assertSame('450.00', $firstPackage['package_price']);
        $this->assertFalse($firstPackage['show_on_public']);
        $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload([
            'ticket_combo_id' => $firstPackageId,
        ]))->assertStatus(422)->assertJsonValidationErrors('ticket_combo_id');
        $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload())
            ->assertCreated()->assertJsonPath('total_amount', '400.00');

        $edit = Livewire::test(EditRaffle::class, ['record' => $raffle->id]);
        $state = $edit->get('data.ticketCombos');
        foreach ($state as &$row) {
            if (($row['quantity'] ?? null) === 5) {
                $row['show_on_public'] = true;
            }
        }
        unset($row);
        $keys = array_keys($state);
        // Keep the repeater's record keys, as the actual browser drag action does.
        $edit->set('data.ticketCombos', $state)
            ->mountFormComponentAction('ticketCombos', 'reorder', ['items' => array_reverse($keys)])
            ->callMountedFormComponentAction()
            ->call('save')
            ->assertHasNoFormErrors();

        $catalogPackages = $this->getJson('/api/raffles/' . $raffle->id)->assertOk()->json('ticket_combos');
        $this->assertSame([6, 5], array_column($catalogPackages, 'quantity'));
        $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload([
            'ticket_combo_id' => $firstPackageId,
        ]))->assertCreated()->assertJsonPath('total_amount', '450.00');

        Livewire::test(EditRaffle::class, ['record' => $raffle->id])
            ->fillForm(['ticketCombos' => []])
            ->call('save')
            ->assertHasNoFormErrors();
        $this->getJson('/api/raffles/' . $raffle->id)->assertOk()->assertJsonCount(0, 'ticket_combos');
        foreach ($catalogPackages as $package) {
            $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload([
                'ticket_combo_id' => $package['id'],
            ]))->assertStatus(422)->assertJsonValidationErrors('ticket_combo_id');
        }
        $this->assertSame($originalPublicOrder, $this->publicOrder($originalOrder)->assertOk()->json());
        $this->assertDatabaseHas('orders', [
            'id' => $originalOrder['id'],
            'ticket_combo_id' => $firstPackageId,
            'quantity' => 4,
            'total_amount' => '300.00',
        ]);
    }

    public function test_retiring_banks_and_raffles_preserves_public_order_history_and_blocks_new_checkout(): void
    {
        $bank = BankAccount::firstOrFail();
        $order = $this->postJson('/api/raffles/20/checkout', $this->checkoutPayload([
            'bank_account_id' => $bank->id,
        ]))->assertCreated()->json();
        $before = $this->publicOrder($order)->assertOk()->json();

        Livewire::test(ListBankAccounts::class)
            ->callTableAction('delete', $bank)
            ->assertHasNoTableActionErrors();
        $this->getJson('/api/bank-accounts')->assertOk()->assertJsonMissing(['id' => $bank->id]);
        $this->assertSame($before, $this->publicOrder($order)->assertOk()->json());
        $this->postJson('/api/raffles/20/checkout', $this->checkoutPayload([
            'bank_account_id' => $bank->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('bank_account_id');

        Livewire::test(EditRaffle::class, ['record' => 20])
            ->callAction('delete')
            ->assertHasNoActionErrors();
        $this->getJson('/api/raffles/20')->assertNotFound();
        $ids = array_column($this->getJson('/api/raffles')->assertOk()->json('data'), 'id');
        $this->assertNotContains(20, $ids);
        $this->assertSame($before, $this->publicOrder($order)->assertOk()->json());
        $this->postJson('/api/raffles/20/checkout', $this->checkoutPayload())
            ->assertNotFound();
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_invalid_nested_create_is_rejected_without_parent_or_package_writes(): void
    {
        $raffleCount = Raffle::count();
        $comboCount = TicketCombo::count();
        $catalogBefore = $this->getJson('/api/raffles')->assertOk()->json('data');

        Livewire::test(CreateRaffle::class)
            ->fillForm($this->raffleData('Invalid nested create') + [
                'ticketCombos' => [$this->combo(4, '300.00'), $this->combo(11, '500.00')],
            ])
            ->call('create')
            ->assertHasFormErrors();

        $this->assertSame($raffleCount, Raffle::count());
        $this->assertSame($comboCount, TicketCombo::count());
        $this->assertDatabaseMissing('raffles', ['title' => 'Invalid nested create']);
        $this->assertSame($catalogBefore, $this->getJson('/api/raffles')->assertOk()->json('data'));
    }

    public function test_invalid_nested_edit_does_not_change_parent_or_any_package_history(): void
    {
        $raffle = Raffle::findOrFail(20);
        $originalTitle = $raffle->title;
        $originalGoal = $raffle->ticket_goal;
        $originalMin = $raffle->min_tickets_per_user;
        $originalMax = $raffle->max_tickets_per_user;
        $originalSold = $raffle->tickets_sold_count;
        $originalPackages = TicketCombo::withTrashed()->where('raffle_id', $raffle->id)->orderBy('id')->get([
            'id', 'quantity', 'package_price', 'show_on_public', 'sort_order', 'deleted_at',
        ])->toArray();

        Livewire::test(EditRaffle::class, ['record' => $raffle->id])
            ->fillForm([
                'title' => 'Must not partially save',
                'ticket_goal' => 1234,
                'min_tickets_per_user' => 2,
                'max_tickets_per_user' => 10,
                'ticketCombos' => [$this->combo(10001, '1.00')],
            ])
            ->call('save')
            ->assertHasFormErrors();

        $raffle->refresh();
        $this->assertSame($originalTitle, $raffle->title);
        $this->assertSame($originalGoal, $raffle->ticket_goal);
        $this->assertSame($originalMin, $raffle->min_tickets_per_user);
        $this->assertSame($originalMax, $raffle->max_tickets_per_user);
        $this->assertSame($originalSold, $raffle->tickets_sold_count);
        $this->assertSame($originalPackages, TicketCombo::withTrashed()->where('raffle_id', $raffle->id)->orderBy('id')->get([
            'id', 'quantity', 'package_price', 'show_on_public', 'sort_order', 'deleted_at',
        ])->toArray());
    }

    public function test_new_parent_bounds_are_used_for_valid_package_updates_and_public_checkout(): void
    {
        Livewire::test(CreateRaffle::class)
            ->fillForm($this->raffleData('Dynamic package bounds') + ['ticketCombos' => [$this->combo(4, '300.00')]])
            ->call('create')
            ->assertHasNoFormErrors();
        $raffle = Raffle::where('title', 'Dynamic package bounds')->firstOrFail();

        $edit = Livewire::test(EditRaffle::class, ['record' => $raffle->id]);
        $state = $edit->get('data.ticketCombos');
        $key = array_key_first($state);
        $state[$key]['quantity'] = 12;
        $state[$key]['package_price'] = '900.00';
        $edit->fillForm([
            'min_tickets_per_user' => 11,
            'max_tickets_per_user' => 15,
            'ticketCombos' => $state,
        ])->call('save');
        $edit->assertHasNoFormErrors();

        $this->getJson('/api/raffles/' . $raffle->id)
            ->assertOk()
            ->assertJsonPath('min_tickets_per_user', 11)
            ->assertJsonPath('max_tickets_per_user', 15)
            ->assertJsonPath('ticket_combos.0.quantity', 12)
            ->assertJsonPath('ticket_combos.0.package_price', '900.00');
        $comboId = $raffle->ticketCombos()->firstOrFail()->id;
        $this->postJson('/api/raffles/' . $raffle->id . '/checkout', $this->checkoutPayload([
            'ticket_combo_id' => $comboId,
        ]))->assertCreated()->assertJsonPath('total_amount', '900.00');
    }

    public function test_ticket_reassignment_shows_form_error_and_preserves_order_token_and_counters(): void
    {
        $order = $this->postJson('/api/raffles/20/checkout', $this->checkoutPayload())->assertCreated()->json();
        $ticket = Ticket::create(['raffle_id' => 20, 'order_id' => $order['id'], 'number' => '54321', 'status' => 'validated']);
        $publicBefore = $this->publicOrder($order)->assertOk()->json();
        $soldBefore = Raffle::findOrFail(20)->tickets_sold_count;

        Livewire::test(EditTicket::class, ['record' => $ticket->id])
            ->fillForm(['raffle_id' => 35])
            ->call('save')
            ->assertHasFormErrors(['raffle_id']);

        $this->assertSame(20, (int) $ticket->fresh()->raffle_id);
        $this->assertSame($publicBefore, $this->publicOrder($order)->assertOk()->json());
        $this->assertSame($soldBefore, Raffle::findOrFail(20)->tickets_sold_count);

        Livewire::test(EditTicket::class, ['record' => $ticket->id])
            ->fillForm(['status' => 'sold'])
            ->call('save')
            ->assertHasNoFormErrors();
        $this->assertSame('sold', $ticket->fresh()->status);
        $this->assertSame($publicBefore, $this->publicOrder($order)->assertOk()->json());
    }
}
