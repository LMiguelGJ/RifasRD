<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Image extends Model
{
    protected $fillable = ['path', 'mime_type', 'size'];

    protected $casts = ['size' => 'integer'];

    protected $appends = ['url'];

    /** Same-origin path for demo assets, /storage/ for uploaded ones. */
    public function getUrlAttribute(): string
    {
        if (str_starts_with($this->path, '/') || str_starts_with($this->path, 'http')) {
            return $this->path;
        }

        return '/storage/' . ltrim($this->path, '/');
    }
}
