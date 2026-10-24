<?php

namespace App\Models;

use App\Enums\RaffleStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Raffle extends Model
{
    protected $fillable = [
        'category_id', 'image_id', 'title', 'description', 'ticket_goal', 'ticket_price',
        'max_tickets_per_user', 'min_tickets_per_user', 'winners_count', 'digit_count',
        'status', 'type', 'starts_at', 'ends_at', 'draw_at', 'eighty_percent_notified_at',
        'show_available_tickets', 'show_ends_at', 'custom_fields', 'tickets_sold_count',
    ];

    protected $casts = [
        'ticket_price' => 'decimal:2',
        'status' => RaffleStatus::class,
        'custom_fields' => 'array',
        'show_available_tickets' => 'boolean',
        'show_ends_at' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'draw_at' => 'datetime',
        'eighty_percent_notified_at' => 'datetime',
        'tickets_sold_count' => 'integer',
        'ticket_goal' => 'integer',
        'max_tickets_per_user' => 'integer',
        'min_tickets_per_user' => 'integer',
        'winners_count' => 'integer',
        'digit_count' => 'integer',
    ];

    protected $appends = ['tickets_available_count', 'banner_image'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function image(): BelongsTo
    {
        return $this->belongsTo(Image::class);
    }

    public function ticketCombos(): HasMany
    {
        return $this->hasMany(TicketCombo::class)->orderBy('sort_order');
    }

    public function prizeNumbers(): HasMany
    {
        return $this->hasMany(PrizeNumber::class)->orderBy('sort_order');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function getTicketsAvailableCountAttribute(): int
    {
        return max(0, $this->ticket_goal - $this->tickets_sold_count);
    }

    /** Contract field: the raffle cover image URL (mirrors image.url). */
    public function getBannerImageAttribute(): ?string
    {
        return $this->image?->url;
    }
}
