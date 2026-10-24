<?php

namespace App\Filament\Resources;

use App\Enums\RaffleStatus;
use App\Filament\Resources\RaffleResource\Pages;
use App\Models\Image;
use App\Models\Raffle;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class RaffleResource extends Resource
{
    protected static ?string $model = Raffle::class;

    protected static ?string $navigationIcon = 'heroicon-o-ticket';

    protected static ?string $navigationLabel = 'Rifas';

    protected static ?string $modelLabel = 'rifa';

    protected static ?string $pluralModelLabel = 'rifas';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Datos')->schema([
                Forms\Components\TextInput::make('title')->label('Título')->required()->maxLength(180),
                Forms\Components\Textarea::make('description')->label('Descripción')->rows(3),
                Forms\Components\Select::make('category_id')->label('Categoría')
                    ->relationship('category', 'name')->required()->preload(),
                Forms\Components\FileUpload::make('banner')->label('Foto')
                    ->image()->disk('public')->directory('raffles')->maxSize(5120)
                    ->visibility('public'),
            ])->columns(2),
            Forms\Components\Section::make('Venta')->schema([
                Forms\Components\TextInput::make('ticket_price')->label('Precio del boleto')->numeric()->required(),
                Forms\Components\TextInput::make('ticket_goal')->label('Meta de boletos')->numeric()->required(),
                Forms\Components\TextInput::make('min_tickets_per_user')->label('Mín. por compra')->numeric()->required(),
                Forms\Components\TextInput::make('max_tickets_per_user')->label('Máx. por compra')->numeric()->required(),
                Forms\Components\Select::make('status')->label('Estado')->options([
                    RaffleStatus::Draft->value => 'Borrador',
                    RaffleStatus::Active->value => 'Activa',
                    RaffleStatus::Paused->value => 'Pausada',
                    RaffleStatus::Finished->value => 'Finalizada',
                ])->required(),
                Forms\Components\DateTimePicker::make('starts_at')->label('Inicio'),
                Forms\Components\DateTimePicker::make('draw_at')->label('Fecha de sorteo')
                    ->helperText('Solo se acepta con el 80% de los boletos vendidos.'),
            ])->columns(3),
            Forms\Components\Section::make('Paquetes')->schema([
                Forms\Components\Repeater::make('ticketCombos')->label('')
                    ->relationship()
                    ->schema([
                        Forms\Components\TextInput::make('quantity')->label('Boletos')->numeric()->required(),
                        Forms\Components\TextInput::make('package_price')->label('Precio del paquete')->numeric()->required(),
                        Forms\Components\Select::make('accent')->label('Acento')->options([
                            'blue' => 'Azul',
                            'gold' => 'Dorado',
                        ])->default('blue'),
                        Forms\Components\Toggle::make('show_on_public')->label('Público')->default(true),
                    ])
                    ->columns(4)
                    ->defaultItems(0)
                    ->reorderable('sort_order')
                    ->collapsible(),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable(),
                Tables\Columns\ImageColumn::make('image.url')->label('Foto')->square()->toggleable(),
                Tables\Columns\TextColumn::make('title')->label('Título')->searchable()->limit(36),
                Tables\Columns\TextColumn::make('category.name')->label('Categoría')->badge(),
                Tables\Columns\TextColumn::make('ticket_price')->label('Precio')->money('DOP', true),
                Tables\Columns\TextColumn::make('tickets_sold_count')->label('Vendidos')->sortable(),
                Tables\Columns\TextColumn::make('tickets_available_count')->label('Disponibles'),
                Tables\Columns\TextColumn::make('draw_at')->label('Sorteo')->dateTime('d/m/Y H:i')->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->label('Estado')->badge()->color(fn (string $state): string => match ($state) {
                    RaffleStatus::Active->value => 'success',
                    RaffleStatus::Draft->value => 'gray',
                    RaffleStatus::Paused->value => 'warning',
                    default => 'danger',
                }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Estado')->options([
                    RaffleStatus::Draft->value => 'Borrador',
                    RaffleStatus::Active->value => 'Activa',
                    RaffleStatus::Paused->value => 'Pausada',
                    RaffleStatus::Finished->value => 'Finalizada',
                ]),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRaffles::route('/'),
            'create' => Pages\CreateRaffle::route('/create'),
            'edit' => Pages\EditRaffle::route('/{record}/edit'),
        ];
    }

    /** Store the upload as an Image row and bind it to the raffle. */
    public static function mutateFormDataBeforeCreate(array $data): array
    {
        return static::bindBanner($data);
    }

    public static function mutateFormDataBeforeSave(array $data): array
    {
        return static::bindBanner($data);
    }

    public static function mutateFormDataBeforeFill(array $data): array
    {
        unset($data['banner']);

        return $data;
    }

    private static function bindBanner(array $data): array
    {
        $path = $data['banner'] ?? null;

        if (is_string($path) && $path !== '') {
            $full = Storage::disk('public')->path($path);
            $data['image_id'] = Image::create([
                'path' => $path,
                'mime_type' => mime_content_type($full) ?: 'image/webp',
                'size' => (int) (is_file($full) ? filesize($full) : 0),
            ])->id;
        }

        unset($data['banner']);

        return $data;
    }
}
