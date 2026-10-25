<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Filament\Resources\OrderResource\Pages\ListOrders;
use App\Filament\Resources\RaffleResource\Pages\EditRaffle;
use App\Filament\Resources\RaffleResource\Pages\ListRaffles;
use App\Models\BankAccount;
use App\Models\Order;
use App\Models\Participant;
use App\Models\Raffle;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class AdminMobileAndPhotoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    private function order(): Order
    {
        return Order::create([
            'raffle_id' => 20,
            'participant_id' => Participant::create(['name' => 'Maria Perez', 'phone' => '18095551234'])->id,
            'bank_account_id' => BankAccount::first()->id,
            'customer_name' => 'Maria Perez',
            'phone' => '18095551234',
            'quantity' => 4,
            'total_amount' => '300.00',
            'status' => OrderStatus::PendingValidation,
            'customer_slug' => 'maria-perez',
            'public_view_token' => 'token-mobile-1',
        ]);
    }

    public function test_orders_list_keeps_only_essentials_on_a_phone_and_summarises_the_rest(): void
    {
        $this->order();

        $html = Livewire::test(ListOrders::class)->html();

        $this->assertStringContainsString('md:table-cell', $html, 'secondary columns must be hidden below the md breakpoint');
        $this->assertStringContainsString('Honda CRV Touring', $html, 'the raffle title is summarised under the customer name');
        $this->assertStringContainsString('300.00', $html);
    }

    public function test_row_actions_become_icon_buttons_on_small_screens(): void
    {
        $order = $this->order();

        $html = Livewire::test(ListOrders::class)->html();

        // The class is what the phone CSS uses to turn text links into big icon buttons.
        $this->assertStringContainsString('rd-row-action', $html);
        $this->assertStringContainsString('rd-hide-sm', $html, 'the separate View button is hidden on phones; the row itself opens the order');
        $this->assertStringContainsString('Aprobar', $html, 'the label stays in the markup for desktop and screen readers');
        $this->assertNotNull($order->id);
    }

    public function test_editing_a_raffle_shows_its_current_photo(): void
    {
        $html = Livewire::test(EditRaffle::class, ['record' => 31])->html();

        $this->assertStringContainsString('http://localhost/demo/rev/cbr1000rr-repsol.webp', $html);
        $this->assertStringContainsString('Cambiar foto', $html);
    }

    public function test_uploading_a_new_photo_replaces_the_current_one(): void
    {
        Storage::fake('public');
        $before = Raffle::findOrFail(31)->image_id;

        Livewire::test(EditRaffle::class, ['record' => 31])
            ->fillForm(['banner' => UploadedFile::fake()->image('nueva.jpg', 600, 400)])
            ->call('save')
            ->assertHasNoFormErrors();

        $raffle = Raffle::findOrFail(31);
        $this->assertNotSame($before, $raffle->image_id, 'the raffle must point at the new image');
        $this->assertStringStartsWith('/storage/raffles/', $raffle->image->url);
    }

    public function test_a_raffle_without_a_photo_says_so_in_the_edit_form(): void
    {
        Raffle::where('id', 31)->update(['image_id' => null]);

        Livewire::test(EditRaffle::class, ['record' => 31])->assertSee('aún no tiene foto');
    }

    public function test_raffle_list_summarises_price_and_progress_under_the_title(): void
    {
        $html = Livewire::test(ListRaffles::class)->html();

        $this->assertStringContainsString('vendido', $html);
        $this->assertStringContainsString('md:table-cell', $html);
    }
}
