<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketCombo extends Model
{
    use SoftDeletes;

    protected $fillable = ['raffle_id', 'quantity', 'package_price', 'sort_order', 'show_on_public', 'accent'];

    protected $casts = [
        'package_price' => 'decimal:2',
        'quantity' => 'integer',
        'sort_order' => 'integer',
        'show_on_public' => 'boolean',
    ];

    public function isValidForCheckout(Raffle $raffle): bool
    {
        $quantity = $this->getAttributes()['quantity'] ?? null;
        $price = $this->getAttributes()['package_price'] ?? null;

        return is_scalar($quantity)
            && preg_match('/^[1-9][0-9]*$/', (string) $quantity) === 1
            && (int) $quantity >= $raffle->min_tickets_per_user
            && (int) $quantity <= $raffle->max_tickets_per_user
            && is_numeric($price)
            && (float) $price > 0;
    }

    protected static function booted(): void
    {
        static::saving(function (TicketCombo $combo): void {
            $raffle = Raffle::query()->find($combo->raffle_id);

            if (! $raffle || ! $combo->isValidForCheckout($raffle)) {
                throw ValidationException::withMessages([
                    'ticketCombos' => ['Cada paquete debe tener una cantidad entera dentro de los límites de la rifa y un precio mayor que cero.'],
                ]);
            }
        });
    }

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }
}
