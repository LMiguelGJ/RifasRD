<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public $incrementing = false;

    protected $primaryKey = 'key';

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    /** Maintenance switch consumed by GET /api/security/order-block. */
    public static function orderBlock(): array
    {
        return static::find('order_block')?->value ?? ['blocked' => false, 'message' => null];
    }
}
