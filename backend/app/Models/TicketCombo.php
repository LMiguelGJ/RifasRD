<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketCombo extends Model
{
    protected $fillable = ['raffle_id', 'quantity', 'package_price', 'sort_order', 'show_on_public', 'accent'];

    protected $casts = [
        'package_price' => 'decimal:2',
        'quantity' => 'integer',
        'sort_order' => 'integer',
        'show_on_public' => 'boolean',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }
}
