<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ParticipantResource\Pages;
use App\Models\Participant;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class ParticipantResource extends Resource
{
    protected static ?string $model = Participant::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';

    protected static ?string $navigationLabel = 'Participantes';

    protected static ?string $modelLabel = 'participante';

    protected static ?string $pluralModelLabel = 'participantes';

    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nombre')->required(),
            Forms\Components\TextInput::make('phone')->label('Teléfono')->required(),
            Forms\Components\TextInput::make('email')->label('Correo')->email(),
            Forms\Components\TextInput::make('cedula')->label('Cédula'),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('name')->label('Nombre')->searchable(),
                Tables\Columns\TextColumn::make('phone')->label('Teléfono')->searchable()->copyable(),
                Tables\Columns\TextColumn::make('email')->label('Correo')->placeholder('—')->visibleFrom('md'),
                Tables\Columns\TextColumn::make('orders_count')->label('Pedidos')->counts('orders')->visibleFrom('md'),
                Tables\Columns\TextColumn::make('created_at')->label('Alta')->dateTime('d/m/Y')->sortable()->visibleFrom('lg'),
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
            'index' => Pages\ListParticipants::route('/'),
            'edit' => Pages\EditParticipant::route('/{record}/edit'),
        ];
    }
}
