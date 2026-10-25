<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TicketResource\Pages;
use Closure;
use App\Models\Ticket;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class TicketResource extends Resource
{
    protected static ?string $model = Ticket::class;

    protected static ?string $navigationIcon = 'heroicon-o-hashtag';

    protected static ?string $navigationLabel = 'Boletos';

    protected static ?string $modelLabel = 'boleto';

    protected static ?string $pluralModelLabel = 'boletos';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('number')->label('Número')->required(),
            Forms\Components\Select::make('raffle_id')->label('Rifa')->relationship('raffle', 'title')->required()
                ->rule(fn (?Ticket $record): Closure => function (string $attribute, mixed $value, Closure $fail) use ($record): void {
                    $orderRaffleId = $record?->order?->raffle_id;

                    if ($orderRaffleId !== null && (int) $value !== (int) $orderRaffleId) {
                        $fail('El boleto debe pertenecer a la misma rifa que su pedido.');
                    }
                }),
            Forms\Components\Select::make('status')->label('Estado')->options([
                'validated' => 'Validado',
                'sold' => 'Vendido',
                'cancelled' => 'Cancelado',
            ])->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('number')->label('Número')->searchable()->copyable(),
                Tables\Columns\TextColumn::make('raffle.title')->label('Rifa')->limit(30)->toggleable()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('order.id')->label('Pedido #')->sortable()->toggleable()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('order.customer_name')->label('Cliente')->limit(20)->toggleable()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('order.phone')->label('Teléfono')->searchable(),
                Tables\Columns\TextColumn::make('status')->label('Estado')->badge(),
            ])
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make()->extraAttributes(['class' => 'rd-row-action']),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTickets::route('/'),
            'edit' => Pages\EditTicket::route('/{record}/edit'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
