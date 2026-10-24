<?php

use App\Http\Controllers\Api\CaptchaController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public storefront API (contract: docs/BACKEND-HANDOVER.md)
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:60,1')->group(function () {
    Route::get('categories', [CatalogController::class, 'categories']);
    Route::get('raffles', [CatalogController::class, 'raffles']);
    Route::get('raffles/{raffle}', [CatalogController::class, 'show']);
    Route::get('raffles/{raffle}/prize-numbers', [CatalogController::class, 'prizeNumbers']);
    Route::get('winners/recent', [CatalogController::class, 'winners']);
    Route::get('bank-accounts', [CatalogController::class, 'bankAccounts']);
    Route::get('security/order-block', [CatalogController::class, 'orderBlock']);
    Route::get('captcha', [CaptchaController::class, 'show']);

    Route::post('participants', [CheckoutController::class, 'storeParticipant']);
    Route::post('raffles/{raffle}/checkout', [CheckoutController::class, 'checkout']);
    Route::get('public/orders/{customerSlug}/{publicViewToken}', [CheckoutController::class, 'publicOrder']);
});

// Lookup is rate-limited harder: it reveals matched customer data.
Route::post('raffles/{raffle}/checkout/lookup', [CheckoutController::class, 'lookup'])
    ->middleware('throttle:10,1');
