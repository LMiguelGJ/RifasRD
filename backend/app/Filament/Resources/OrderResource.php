<?php

namespace App\Filament\Resources;

use App\Enums\OrderStatus;
use App\Filament\Resources\OrderResource\Pages;
use App\Models\Order;
use App\Services\ApproveOrderService;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use App\Support\VoucherPath;
use RuntimeException;

class OrderResource extends Resource
{
    protected static ?string $model = Order::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';

    protected static ?string $navigationLabel = 'Pedidos';

    protected static ?string $modelLabel = 'pedido';

    protected static ?string $pluralModelLabel = 'pedidos';

    protected static ?int $navigationSort = 1;

    public static function getNavigationBadge(): ?string
    {
        $pending = static::getModel()::where('status', OrderStatus::PendingValidation)->count();

        return $pending > 0 ? (string) $pending : null;
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Pago')
                ->schema([
                    Forms\Components\Placeholder::make('total')
                        ->label('Total')
                        ->content(fn (Order $record): string => 'RD$ ' . $record->total_amount),
                    Forms\Components\Placeholder::make('bank')
                        ->label('Banco')
                        ->content(fn (Order $record): string => $record->bankAccount?->bank_name . ' · ' . $record->bankAccount?->account_number),
                    Forms\Components\Placeholder::make('voucher')
                        ->label('Comprobante')
                        ->content(fn (Order $record): string => $record->voucher_path ? 'Adjunto' : 'Sin comprobante'),
                ])->columns(3),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('id')->label('#')->sortable(),
                Tables\Columns\TextColumn::make('customer_name')->label('Cliente')->searchable()->limit(24),
                Tables\Columns\TextColumn::make('raffle.title')->label('Rifa')->limit(28)->toggleable(),
                Tables\Columns\TextColumn::make('total_amount')->label('Total')->money('DOP', true)->sortable(),
                Tables\Columns\TextColumn::make('bankAccount.bank_name')->label('Banco')->toggleable(),
                Tables\Columns\TextColumn::make('phone')->label('Teléfono')->searchable()->toggleable(),
                Tables\Columns\TextColumn::make('status')->label('Estado')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        OrderStatus::PendingValidation->value => 'Pendiente de validación',
                        OrderStatus::Validated->value => 'Validado',
                        OrderStatus::Cancelled->value => 'Cancelado',
                        default => $state,
                    })
                    ->color(fn (string $state): string => match ($state) {
                        OrderStatus::PendingValidation->value => 'warning',
                        OrderStatus::Validated->value => 'success',
                        OrderStatus::Cancelled->value => 'danger',
                        default => 'gray',
                    }),
                Tables\Columns\TextColumn::make('created_at')->label('Fecha')->dateTime('d/m/Y H:i')->sortable()->toggleable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')->label('Estado')
                    ->options([
                        OrderStatus::PendingValidation->value => 'Pendientes de validación',
                        OrderStatus::Validated->value => 'Validados',
                        OrderStatus::Cancelled->value => 'Cancelados',
                    ])
                    ->default(OrderStatus::PendingValidation->value),
                Tables\Filters\SelectFilter::make('raffle_id')->label('Rifa')
                    ->relationship('raffle', 'title'),
            ])
            ->actions([
                Tables\Actions\Action::make('approve')->label('Aprobar')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->hidden(fn (Order $record): bool => $record->status !== OrderStatus::PendingValidation)
                    ->action(function (Order $record) {
                        static::safeAction(fn () => app(ApproveOrderService::class)->approve($record), $record, 'aprobado');
                    }),
                Tables\Actions\Action::make('reject')->label('Rechazar')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->hidden(fn (Order $record): bool => $record->status !== OrderStatus::PendingValidation)
                    ->action(function (Order $record) {
                        static::safeAction(fn () => app(ApproveOrderService::class)->reject($record), $record, 'rechazado');
                    }),
                Tables\Actions\Action::make('voucher')->label('Comprobante')
                    ->icon('heroicon-o-document')
                    ->visible(fn (Order $record): bool => (bool) $record->voucher_path)
                    ->action(fn (Order $record) => response()->download(VoucherPath::resolve($record->voucher_path))),
                Tables\Actions\ViewAction::make(),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'view' => Pages\ViewOrder::route('/{record}'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    /** @param callable(): mixed $callback */
    private static function safeAction(callable $callback, Order $record, string $verb): void
    {
        try {
            $callback();
            Notification::make()
                ->title("Pedido #{$record->id} {$verb}")
                ->success()
                ->send();
        } catch (RuntimeException $exception) {
            Notification::make()
                ->title('Operación rechazada')
                ->body($exception->getMessage())
                ->danger()
                ->send();
        }
    }
}
