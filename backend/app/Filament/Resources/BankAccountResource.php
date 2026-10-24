<?php

namespace App\Filament\Resources;

use App\Filament\Resources\BankAccountResource\Pages;
use App\Models\BankAccount;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class BankAccountResource extends Resource
{
    protected static ?string $model = BankAccount::class;

    protected static ?string $navigationIcon = 'heroicon-o-building-library';

    protected static ?string $navigationLabel = 'Bancos';

    protected static ?string $modelLabel = 'cuenta bancaria';

    protected static ?string $pluralModelLabel = 'bancos';

    protected static ?int $navigationSort = 5;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('bank_name')->label('Banco')->required(),
            Forms\Components\TextInput::make('account_type')->label('Tipo de cuenta'),
            Forms\Components\TextInput::make('account_number')->label('Número de cuenta')->required(),
            Forms\Components\TextInput::make('account_holder_name')->label('Titular')->required(),
            Forms\Components\TextInput::make('holder_id')->label('Cédula del titular'),
            Forms\Components\TextInput::make('currency')->label('Moneda')->default('DOP'),
            Forms\Components\TextInput::make('sort_order')->label('Orden')->numeric()->default(0),
            Forms\Components\Toggle::make('is_active')->label('Activa')->default(true),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('bank_name')->label('Banco')->searchable(),
                Tables\Columns\TextColumn::make('account_type')->label('Tipo')->toggleable(),
                Tables\Columns\TextColumn::make('account_number')->label('Número')->copyable(),
                Tables\Columns\TextColumn::make('account_holder_name')->label('Titular'),
                Tables\Columns\IconColumn::make('is_active')->label('Activa')->boolean(),
                Tables\Columns\TextColumn::make('sort_order')->label('Orden')->sortable(),
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
            'index' => Pages\ListBankAccounts::route('/'),
            'create' => Pages\CreateBankAccount::route('/create'),
            'edit' => Pages\EditBankAccount::route('/{record}/edit'),
        ];
    }
}
