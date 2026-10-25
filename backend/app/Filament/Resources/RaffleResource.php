<?php

namespace App\Filament\Resources;

use App\Enums\RaffleStatus;
use Closure;
use Illuminate\Support\HtmlString;
use App\Filament\Resources\RaffleResource\Pages;
use App\Models\Image;
use App\Models\Raffle;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Get;
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
                // Editing: show the photo the raffle has today, then offer a replacement.
                Forms\Components\Placeholder::make('current_photo')
                    ->label('Foto actual')
                    ->visibleOn('edit')
                    ->content(fn (?Raffle $record): HtmlString => new HtmlString(
                        $record?->image
                            ? '<img src="' . e(url($record->image->url)) . '" alt="Foto actual de la rifa" class="rd-photo-preview">'
                            : '<span class="rd-photo-empty">Esta rifa aún no tiene foto.</span>'
                    )),
                Forms\Components\FileUpload::make('banner')
                    ->label(fn (string $operation): string => $operation === 'edit' ? 'Cambiar foto' : 'Foto')
                    ->helperText('Sube una imagen nueva para reemplazar la actual. JPG o PNG, máximo 5 MB.')
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
                    ->helperText('Solo se acepta con el 80% de los boletos vendidos.')
                    ->rule(fn (Get $get, ?Raffle $record): Closure => function (string $attribute, mixed $value, Closure $fail) use ($get, $record): void {
                        $goal = (int) $get('ticket_goal');
                        $sold = (int) ($record?->tickets_sold_count ?? 0);

                        if ($goal > 0 && $sold < (int) ceil($goal * 0.8)) {
                            $fail('La fecha del sorteo solo se acepta cuando se ha vendido el 80% de los boletos.');
                        }
                    }),
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
                Tables\Columns\TextColumn::make('id')->label('#')->sortable()->visibleFrom('md'),
                // Absolute URL on purpose: the demo photos live under /demo (served by the SPA
                // build), not in the storage disk. For a non-URL value Filament checks the disk
                // and renders an empty src when the file is not there.
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('Foto')
                    ->square()
                    ->toggleable()
                    ->getStateUsing(fn (Raffle $record): ?string => $record->image ? url($record->image->url) : null),
                Tables\Columns\TextColumn::make('title')->label('Título')->searchable()
                    ->wrap()
                    ->description(fn (Raffle $record): string => 'RD$ ' . number_format((float) $record->ticket_price, 2)
                        . ($record->ticket_goal > 0 ? ' · ' . round($record->tickets_sold_count / $record->ticket_goal * 100) . '% vendido' : ''))
                    ->extraAttributes(['class' => 'rd-mobile-desc']),
                Tables\Columns\TextColumn::make('category.name')->label('Categoría')->badge()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('ticket_price')->label('Precio')->money('DOP', true)->visibleFrom('md'),
                Tables\Columns\TextColumn::make('tickets_sold_count')->label('Vendidos')->sortable()->visibleFrom('md'),
                Tables\Columns\TextColumn::make('tickets_available_count')->label('Disponibles')->visibleFrom('lg'),
                Tables\Columns\TextColumn::make('draw_at')->label('Sorteo')->dateTime('d/m/Y H:i')->placeholder('—')->visibleFrom('lg'),
                Tables\Columns\TextColumn::make('status')->label('Estado')->badge(),
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
                Tables\Actions\EditAction::make()->extraAttributes(['class' => 'rd-row-action']),
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

    /**
     * Store the upload as an Image row and bind it to the raffle. Called from the
     * create/edit pages (Filament only invokes mutateFormData* hooks on pages).
     */
    public static function bindBanner(array $data): array
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
