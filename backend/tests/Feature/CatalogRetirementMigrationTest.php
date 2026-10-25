<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CatalogRetirementMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_retirement_migration_can_rollback_and_reapply_without_dropping_columns(): void
    {
        config(['database.connections.retirement_probe' => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]]);
        foreach (['ticket_combos', 'raffles', 'bank_accounts'] as $table) {
            Schema::connection('retirement_probe')->create($table, fn ($definition) => $definition->id());
        }

        $options = [
            '--database' => 'retirement_probe',
            '--path' => 'database/migrations/2026_10_25_000001_add_catalog_retirement_columns.php',
            '--force' => true,
        ];

        $this->assertSame(0, Artisan::call('migrate', $options), Artisan::output());
        $this->assertSame(0, Artisan::call('migrate:rollback', $options + ['--step' => 1]), Artisan::output());
        $this->assertTrue(Schema::connection('retirement_probe')->hasColumn('raffles', 'deleted_at'));
        $this->assertSame(0, Artisan::call('migrate', $options), Artisan::output());
        foreach (['ticket_combos', 'raffles', 'bank_accounts'] as $table) {
            $this->assertTrue(Schema::connection('retirement_probe')->hasColumn($table, 'deleted_at'));
        }
    }
}
