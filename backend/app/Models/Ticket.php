<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Ticket extends Model
{
    protected static function booted(): void
    {
        static::saving(function (Ticket $ticket): void {
            if ($ticket->order_id === null) {
                return;
            }

            $orderRaffleId = Order::whereKey($ticket->order_id)->value('raffle_id');
            if ($orderRaffleId !== null && (int) $ticket->raffle_id !== (int) $orderRaffleId) {
                throw ValidationException::withMessages([
                    'raffle_id' => ['El boleto debe pertenecer a la misma rifa que su pedido.'],
                ]);
            }
        });
    }

    protected $fillable = ['raffle_id', 'order_id', 'participant_id', 'number', 'status'];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class)->withTrashed();
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }
}
