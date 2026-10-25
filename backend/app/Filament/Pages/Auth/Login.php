<?php

namespace App\Filament\Pages\Auth;

use Filament\Pages\Auth\Login as BaseLogin;
use Illuminate\Contracts\Support\Htmlable;

/** Panel sign-in, worded like the storefront's official-confirmation screens. */
class Login extends BaseLogin
{
    public function getHeading(): string | Htmlable
    {
        return 'Panel de administración';
    }

    public function getSubHeading(): string | Htmlable | null
    {
        return 'Acceso oficial';
    }
}
