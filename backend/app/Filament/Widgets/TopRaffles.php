<?php

namespace App\Filament\Widgets;

use App\Models\Raffle;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class TopRaffles extends BaseWidget
{
    protected static ?int $sort = 2;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(fn () => Raffle::query()->orderByDesc('tickets_sold_count')->limit(5))
            ->columns([
                Tables\Columns\TextColumn::make('title')->label('Rifa')->limit(40),
                Tables\Columns\TextColumn::make('ticket_price')->label('Precio')->money('DOP', true),
                Tables\Columns\TextColumn::make('tickets_sold_count')->label('Vendidos'),
                Tables\Columns\TextColumn::make('tickets_available_count')->label('Disponibles'),
                Tables\Columns\TextColumn::make('progress')
                    ->label('% vendido')
                    ->state(fn (Raffle $raffle): string => $raffle->ticket_goal > 0
                        ? round($raffle->tickets_sold_count / $raffle->ticket_goal * 100) . '%'
                        : '0%'),
            ])
            ->paginated(false);
    }
}
