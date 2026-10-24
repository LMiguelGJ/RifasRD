<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HealthTest extends TestCase
{
    use RefreshDatabase;

    public function test_healthz_reports_ok(): void
    {
        $this->getJson('/healthz')
            ->assertOk()
            ->assertExactJson(['status' => 'ok', 'database' => 'ok']);
    }

    public function test_healthz_reports_degraded_when_database_is_down(): void
    {
        DB::shouldReceive('select')->andThrow(new \RuntimeException('connection refused'));

        $this->getJson('/healthz')
            ->assertStatus(503)
            ->assertExactJson(['status' => 'degraded', 'database' => 'down']);
    }
}
