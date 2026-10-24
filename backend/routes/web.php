<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Container health probe (Docker HEALTHCHECK hits /healthz)
|--------------------------------------------------------------------------
|
| nginx serves the Angular SPA for every non-PHP path, so there is no "/"
| route here on purpose.
|
*/

Route::get('/healthz', function () {
    try {
        DB::select('select 1');

        return response()->json(['status' => 'ok', 'database' => 'ok']);
    } catch (\Throwable) {
        return response()->json(['status' => 'degraded', 'database' => 'down'], 503);
    }
});
