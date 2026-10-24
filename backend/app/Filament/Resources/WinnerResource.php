<?php

namespace App\Filament\Resources;

use App\Filament\Resources\WinnerResource\Pages;
use App\Models\Winner;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class WinnerResource extends Resource
{
    protected static ?string $model = Winner::class;

    protected static ?string $navigationIcon = 'heroicon-o-trophy';

    protected static ?string $navigationLabel = 'Ganadores';

    protected static ?string $modelLabel = 'ganador';

    protected static ?string $pluralModelLabel = 'ganadores';

    protected static ?int $navigationSort = 6;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Select::make('raffle_id')->label('Rifa')
                ->relationship('raffle', 'title')->searchable()->preload(),
            Forms\Components\TextInput::make('display_name')->label('Nombre del ganador')->required(),
            Forms\Components\TextInput::make('prize_label')->label('Premio'),
            Forms\Components\DateTimePicker::make('drawn_at')->label('Fecha del sorteo'),
            Forms\Components\Select::make('winner_type')->label('Tipo')->options([
                'main' => 'Premio principal',
                'prize_number' => 'Premio por número',
            ])->default('main')->required(),
            Forms\Components\TextInput::make('custom_raffle_title')->label('Título personalizado')
                ->helperText('Opcional: sobreescribe el título de la rifa en la web.'),
            Forms\Components\TextInput::make('custom_ticket_number')->label('Número personalizado')
                ->helperText('Opcional: sobreescribe el número ganador en la web.'),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('display_name')->label('Ganador')->searchable(),
                Tables\Columns\TextColumn::make('display_raffle_title')->label('Rifa / premio')->limit(32),
                Tables\Columns\TextColumn::make('display_ticket_number')->label('Número')->placeholder('—'),
                Tables\Columns\TextColumn::make('winner_type')->label('Tipo')->badge()->formatStateUsing(fn (string $state): string => $state === 'main' ? 'Principal' : 'Por número'),
                Tables\Columns\TextColumn::make('drawn_at')->label('Sorteo')->dateTime('d/m/Y H:i')->placeholder('—'),
            ])
            ->filters([])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListWinners::route('/'),
            'create' => Pages\CreateWinner::route('/create'),
            'edit' => Pages\EditWinner::route('/{record}/edit'),
        ];
    }
}
