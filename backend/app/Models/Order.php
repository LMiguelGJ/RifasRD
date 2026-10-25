<?php

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'raffle_id', 'ticket_combo_id', 'participant_id', 'bank_account_id',
        'customer_name', 'cedula', 'phone', 'email', 'quantity', 'total_amount',
        'status', 'customer_slug', 'public_view_token', 'voucher_path', 'validated_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'status' => OrderStatus::class,
        'quantity' => 'integer',
        'validated_at' => 'datetime',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class)->withTrashed();
    }

    public function ticketCombo(): BelongsTo
    {
        return $this->belongsTo(TicketCombo::class)->withTrashed();
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }

    public function bankAccount(): BelongsTo
    {
        return $this->belongsTo(BankAccount::class)->withTrashed();
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}
