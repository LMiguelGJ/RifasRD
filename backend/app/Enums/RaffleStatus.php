<?php

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum RaffleStatus: string implements HasColor, HasLabel
{
    case Draft = 'draft';
    case Active = 'active';
    case Paused = 'paused';
    case Finished = 'finished';

    public function getLabel(): string
    {
        return match ($this) {
            self::Draft => 'Borrador',
            self::Active => 'Activa',
            self::Paused => 'Pausada',
            self::Finished => 'Finalizada',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::Active => 'success',
            self::Draft => 'gray',
            self::Paused => 'warning',
            self::Finished => 'danger',
        };
    }
}
