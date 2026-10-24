<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PendingValidation = 'pending_validation';
    case Confirmed = 'confirmed';
    case Validated = 'validated';
    case Paid = 'paid';
    case Sold = 'sold';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
    case Pending = 'pending';
}
