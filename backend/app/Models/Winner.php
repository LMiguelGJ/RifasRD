<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Winner extends Model
{
    protected $fillable = [
        'raffle_id', 'ticket_id', 'participant_id', 'portrait_image_id',
        'display_name', 'prize_label', 'drawn_at', 'winner_type',
        'custom_raffle_title', 'custom_ticket_number',
    ];

    protected $casts = ['drawn_at' => 'datetime'];

    protected $appends = ['display_raffle_title', 'display_ticket_number'];

    public function raffle(): BelongsTo
    {
        return $this->belongsTo(Raffle::class);
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }

    public function portraitImage(): BelongsTo
    {
        return $this->belongsTo(Image::class, 'portrait_image_id');
    }

    public function getDisplayRaffleTitleAttribute(): ?string
    {
        return $this->custom_raffle_title ?? $this->raffle?->title;
    }

    public function getDisplayTicketNumberAttribute(): ?string
    {
        return $this->custom_ticket_number ?? $this->ticket?->number;
    }
}
