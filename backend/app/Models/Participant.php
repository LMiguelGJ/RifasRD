<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Participant extends Model
{
    protected $fillable = ['name', 'cedula', 'phone', 'email'];

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
