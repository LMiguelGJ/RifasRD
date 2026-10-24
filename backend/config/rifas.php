<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Admin bootstrap
    |--------------------------------------------------------------------------
    |
    | Read by DatabaseSeeder. Kept in config (not env()) so it keeps working
    | after `config:cache`. A null password means "never touch an existing
    | password" and "random password for a brand-new user".
    |
    */
    'admin' => [
        'email' => env('ADMIN_EMAIL', 'admin@rifasrd.local'),
        'password' => env('ADMIN_PASSWORD'),
    ],
];
