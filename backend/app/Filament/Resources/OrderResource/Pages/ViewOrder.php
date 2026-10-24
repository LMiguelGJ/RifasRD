<?php

namespace App\Filament\Resources\OrderResource\Pages;

use App\Enums\OrderStatus;
use App\Filament\Resources\OrderResource;
use App\Services\ApproveOrderService;
use Filament\Actions;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Resources\Pages\ViewRecord;
use App\Support\VoucherPath;
use RuntimeException;

class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Infolists\Components\Section::make('Cliente')->schema([
                Infolists\Components\TextEntry::make('customer_name')->label('Nombre'),
                Infolists\Components\TextEntry::make('phone')->label('Teléfono'),
                Infolists\Components\TextEntry::make('email')->label('Correo')->placeholder('—'),
            ])->columns(3),
            Infolists\Components\Section::make('Pago')->schema([
                Infolists\Components\TextEntry::make('raffle.title')->label('Rifa'),
                Infolists\Components\TextEntry::make('total_amount')->label('Total')->money('DOP', true),
                Infolists\Components\TextEntry::make('bankAccount.bank_name')->label('Banco'),
                Infolists\Components\TextEntry::make('quantity')->label('Boletos'),
                Infolists\Components\TextEntry::make('status')->label('Estado')->badge(),
            ])->columns(5),
            Infolists\Components\Section::make('Boletos asignados')->schema([
                Infolists\Components\TextEntry::make('tickets_numbers')
                    ->label('')
                    ->state(fn ($record): string => $record->tickets->pluck('number')->join(' · ') ?: 'Aún sin asignar'),
            ]),
        ]);
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('voucher')->label('Ver comprobante')
                ->icon('heroicon-o-document')
                ->visible(fn (): bool => (bool) $this->record->voucher_path)
                ->action(fn () => response()->download(VoucherPath::resolve($this->record->voucher_path))),
            Actions\Action::make('approve')->label('Aprobar')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->requiresConfirmation()
                ->visible(fn (): bool => $this->record->status === OrderStatus::PendingValidation)
                ->action(function () {
                    try {
                        app(ApproveOrderService::class)->approve($this->record);
                        $this->redirect(OrderResource::getUrl('index'));
                    } catch (RuntimeException $exception) {
                        \Filament\Notifications\Notification::make()
                            ->title('Operación rechazada')
                            ->body($exception->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
            Actions\Action::make('reject')->label('Rechazar')
                ->icon('heroicon-o-x-circle')
                ->color('danger')
                ->requiresConfirmation()
                ->visible(fn (): bool => $this->record->status === OrderStatus::PendingValidation)
                ->action(function () {
                    try {
                        app(ApproveOrderService::class)->reject($this->record);
                        $this->redirect(OrderResource::getUrl('index'));
                    } catch (RuntimeException $exception) {
                        \Filament\Notifications\Notification::make()
                            ->title('Operación rechazada')
                            ->body($exception->getMessage())
                            ->danger()
                            ->send();
                    }
                }),
        ];
    }
}
