<?php

namespace App\Models;

use App\Enums\RaffleStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Raffle extends Model
{
    use SoftDeletes;

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

    /** Eager-load counter, internal only (avoids an N+1 in tickets_available_count). */
    protected $hidden = ['prize_numbers_count'];

    protected static function booted(): void
    {
        // Business rule: the draw date is only settable once 80% of the goal is sold.
        static::saving(function (Raffle $raffle) {
            if ($raffle->draw_at !== null && $raffle->ticket_goal > 0) {
                $sold = (int) $raffle->tickets_sold_count;

                if ($sold < (int) ceil($raffle->ticket_goal * 0.8)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'draw_at' => ['The draw date can only be set after 80% of tickets are sold.'],
                    ]);
                }
            }
        });
    }

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

    /** Digits of a ticket number, clamped to what the number generator supports. */
    public function numberDigits(): int
    {
        return max(1, min(7, (int) $this->digit_count));
    }

    /** Size of the number space: 10^digits (e.g. 100000 for 5 digits). */
    public function numberPool(): int
    {
        return 10 ** $this->numberDigits();
    }

    /**
     * Tickets that can really be sold: the goal, but never more than the free
     * number space (pool minus numbers reserved as prizes). Otherwise an order
     * could pass checkout and then fail at approval for lack of numbers.
     */
    public function sellableCapacity(): int
    {
        $prizes = (int) ($this->prize_numbers_count ?? $this->prizeNumbers()->count());

        return max(0, min((int) $this->ticket_goal, $this->numberPool() - $prizes));
    }

    public function getTicketsAvailableCountAttribute(): int
    {
        return max(0, $this->sellableCapacity() - $this->tickets_sold_count);
    }

    /** Contract field: the raffle cover image URL (mirrors image.url). */
    public function getBannerImageAttribute(): ?string
    {
        return $this->image?->url;
    }
}
