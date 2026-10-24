<?php

namespace Tests\Feature;

use App\Models\Raffle;
use Database\Seeders\CatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(CatalogSeeder::class);
    }

    public function test_categories_match_contract(): void
    {
        $response = $this->getJson('/api/categories')->assertOk();

        $this->assertCount(4, $response->json());
        $response->assertJsonFragment(['id' => 1, 'name' => 'Vehículos', 'slug' => 'vehiculo']);
    }

    public function test_raffles_pagination_matches_contract(): void
    {
        $response = $this->getJson('/api/raffles?per_page=50')->assertOk();

        $body = $response->json();
        $this->assertSame(12, $body['total']);
        $this->assertSame(1, $body['current_page']);

        foreach (['current_page', 'data', 'first_page_url', 'from', 'last_page', 'last_page_url', 'links', 'next_page_url', 'path', 'per_page', 'prev_page_url', 'to', 'total'] as $key) {
            $this->assertArrayHasKey($key, $body, "pagination is missing {$key}");
        }

        $raffle = $body['data'][0];
        foreach (['id', 'category_id', 'title', 'description', 'ticket_goal', 'ticket_price', 'min_tickets_per_user', 'max_tickets_per_user', 'digit_count', 'status', 'type', 'tickets_sold_count', 'tickets_available_count', 'banner_image', 'category', 'image', 'ticket_combos'] as $key) {
            $this->assertArrayHasKey($key, $raffle, "raffle is missing {$key}");
        }

        $this->assertIsString($raffle['ticket_price']);
    }

    public function test_raffles_can_filter_by_category(): void
    {
        $response = $this->getJson('/api/raffles?category_id=3')->assertOk();

        $this->assertSame(2, $response->json('total'));
    }

    public function test_single_raffle_includes_combos(): void
    {
        $response = $this->getJson('/api/raffles/20')->assertOk();

        $this->assertSame('Honda CRV Touring Híbrida 2026', $response->json('title'));
        $this->assertNotEmpty($response->json('ticket_combos'));
        $this->assertIsString($response->json('ticket_combos.0.package_price'));
    }

    public function test_prize_numbers_match_contract(): void
    {
        $response = $this->getJson('/api/raffles/20/prize-numbers')->assertOk();

        $this->assertCount(20, $response->json());
        $first = $response->json()[0];
        foreach (['id', 'number', 'prize_label', 'prize_amount', 'status', 'sort_order'] as $key) {
            $this->assertArrayHasKey($key, $first);
        }
    }

    public function test_winners_recent_main_kind(): void
    {
        $response = $this->getJson('/api/winners/recent?kind=main&limit=5')->assertOk();

        $this->assertNotEmpty($response->json());
        $winner = $response->json()[0];
        foreach (['id', 'display_name', 'prize_label', 'drawn_at', 'winner_type', 'display_raffle_title', 'display_ticket_number'] as $key) {
            $this->assertArrayHasKey($key, $winner);
        }
    }

    public function test_bank_accounts_are_active_fake_demo_rows(): void
    {
        $response = $this->getJson('/api/bank-accounts')->assertOk();

        $this->assertCount(7, $response->json());
        $this->assertSame('0000-0000-0001', $response->json('0.account_number'));
    }

    public function test_order_block_shape(): void
    {
        $this->getJson('/api/security/order-block')
            ->assertOk()
            ->assertExactJson(['blocked' => false, 'message' => null]);
    }

    public function test_captcha_issue_shape(): void
    {
        $response = $this->getJson('/api/captcha')->assertOk();

        $this->assertArrayHasKey('captcha_id', $response->json());
        $this->assertStringContainsString('<svg', $response->json('captcha_svg'));
    }

    public function test_draft_raffles_are_not_public(): void
    {
        Raffle::query()->where('id', 20)->update(['status' => 'draft']);

        $this->getJson('/api/raffles/20')->assertNotFound();
        $this->assertSame(11, $this->getJson('/api/raffles')->json('total'));
    }
}
