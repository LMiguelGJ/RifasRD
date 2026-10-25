<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankAccount extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'bank_name', 'account_type', 'account_number', 'account_holder_name',
        'holder_id', 'currency', 'is_active', 'sort_order', 'color', 'image_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function image(): BelongsTo
    {
        return $this->belongsTo(Image::class);
    }
}
