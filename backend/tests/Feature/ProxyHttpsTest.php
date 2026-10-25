<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * In production TLS ends at Dokploy's proxy and nginx talks plain HTTP to PHP.
 * Without proxy trust, asset URLs come out as http:// and browsers block them
 * as mixed content, leaving the admin panel unstyled.
 */
class ProxyHttpsTest extends TestCase
{
    public function test_admin_assets_use_https_when_the_proxy_says_the_request_was_https(): void
    {
        $html = $this->withHeaders(['X-Forwarded-Proto' => 'https', 'X-Forwarded-Host' => 'rifas.example.com'])
            ->get('/admin/login')
            ->assertOk()
            ->getContent();

        $this->assertStringContainsString('https://rifas.example.com/css/filament/filament/app.css', $html);
        $this->assertStringNotContainsString('http://rifas.example.com/css/filament', $html);
        $this->assertStringNotContainsString('http://rifas.example.com/js/filament', $html);
    }

    public function test_plain_http_requests_still_work_without_forwarded_headers(): void
    {
        $this->get('/admin/login')->assertOk();
        $this->getJson('/healthz')->assertOk();
    }
}
