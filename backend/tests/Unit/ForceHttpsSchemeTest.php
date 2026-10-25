<?php

namespace Tests\Unit;

use App\Providers\AppServiceProvider;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * The https branch only runs when APP_URL starts with https, which is never the
 * case under test, so it shipped broken (missing import) and took production down.
 */
class ForceHttpsSchemeTest extends TestCase
{
    public function test_an_https_app_url_forces_https_links(): void
    {
        config(['app.url' => 'https://rifas.example.com']);

        (new AppServiceProvider($this->app))->boot();

        $this->assertStringStartsWith('https://', URL::to('/css/filament/app.css'));
    }

    public function test_a_plain_http_app_url_leaves_links_untouched(): void
    {
        config(['app.url' => 'http://localhost']);
        URL::forceScheme('http');

        (new AppServiceProvider($this->app))->boot();

        $this->assertStringStartsWith('http://', URL::to('/x'));
    }
}
