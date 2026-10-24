<?php

namespace App\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum OrderStatus: string implements HasColor, HasLabel
{
    case PendingValidation = 'pending_validation';
    case Confirmed = 'confirmed';
    case Validated = 'validated';
    case Paid = 'paid';
    case Sold = 'sold';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Pending = 'pending';

    public function getLabel(): string
    {
        return match ($this) {
            self::PendingValidation => 'Pendiente de validación',
            self::Confirmed => 'Confirmado',
            self::Validated => 'Validado',
            self::Paid => 'Pagado',
            self::Sold => 'Vendido',
            self::Cancelled => 'Cancelado',
            self::Expired => 'Expirado',
            self::Pending => 'Pendiente',
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::PendingValidation, self::Pending => 'warning',
            self::Confirmed, self::Validated, self::Paid, self::Sold => 'success',
            self::Cancelled, self::Expired => 'danger',
        };
    }
}
