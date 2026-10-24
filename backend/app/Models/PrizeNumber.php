<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrizeNumber extends Model
{
    protected $fillable = ['raffle_id', 'number', 'prize_label', 'prize_amount', 'status', 'sort_order'];

    protected $casts = [
        'prize_amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }
}
