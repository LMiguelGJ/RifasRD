<?php

namespace Tests\Feature;

use App\Filament\Widgets\IncomeChart;
use App\Filament\Widgets\StatsOverview;
use App\Filament\Widgets\TopRaffles;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** The dashboard widgets are lazy-loaded; render each one directly with data. */
class DashboardWidgetsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
        $this->actingAs(User::factory()->create(['role' => 'admin']));
    }

    public function test_stats_overview_renders_its_figures(): void
    {
        Livewire::test(StatsOverview::class)
            ->assertSee('Ventas del día')
            ->assertSee('Pedidos por validar')
            ->assertSee('Boletos asignados hoy');
    }

    public function test_top_raffles_lists_the_best_sellers(): void
    {
        Livewire::test(TopRaffles::class)->assertSee('Honda CRV Touring');
    }

    public function test_income_chart_renders(): void
    {
        Livewire::test(IncomeChart::class)->assertSee('Ingresos');
    }
}
