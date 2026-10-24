<?php

namespace Tests\Feature;

use App\Filament\Resources\OrderResource;
use App\Filament\Resources\UserResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function operator(): User
    {
        return User::factory()->create(['role' => 'operator']);
    }

    public function test_login_page_is_public(): void
    {
        $this->get('/admin/login')->assertOk();
    }

    public function test_admin_sees_dashboard_and_orders(): void
    {
        $this->actingAs($this->admin());

        $this->get('/admin')->assertOk();
        $this->get(OrderResource::getUrl())->assertOk();
    }

    public function test_orders_list_renders_with_pending_filter(): void
    {
        $this->actingAs($this->admin());

        Livewire::test(OrderResource\Pages\ListOrders::class)
            ->assertSuccessful();
    }

    public function test_user_management_is_admin_only(): void
    {
        $this->actingAs($this->admin());
        $this->assertTrue(UserResource::canViewAny());

        $this->actingAs($this->operator());
        $this->assertFalse(UserResource::canViewAny());
        $this->get(UserResource::getUrl())->assertForbidden();
    }

    public function test_maintenance_toggle_roundtrip(): void
    {
        $this->actingAs($this->admin());

        Livewire::test(\App\Filament\Pages\MaintenancePage::class)
            ->fillForm(['blocked' => true, 'message' => 'Volviendo pronto'])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->getJson('/api/security/order-block')
            ->assertOk()
            ->assertExactJson(['blocked' => true, 'message' => 'Volviendo pronto']);
    }
}
