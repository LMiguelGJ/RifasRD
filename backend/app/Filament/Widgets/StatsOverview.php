<?php

namespace App\Filament\Widgets;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Ticket;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $today = now()->startOfDay();

        $salesToday = Order::where('status', OrderStatus::Validated)
            ->where('validated_at', '>=', $today)
            ->sum('total_amount');

        $pending = Order::where('status', OrderStatus::PendingValidation)->count();

        $ticketsToday = Ticket::where('created_at', '>=', $today)->count();

        return [
            Stat::make('Ventas del día', 'RD$ ' . number_format((float) $salesToday, 2))
                ->description('Pedidos validados hoy')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('success'),
            Stat::make('Pedidos por validar', (string) $pending)
                ->description('Esperando revisión')
                ->descriptionIcon('heroicon-m-clock')
                ->color($pending > 0 ? 'warning' : 'gray'),
            Stat::make('Boletos asignados hoy', (string) $ticketsToday)
                ->description('Números emitidos')
                ->descriptionIcon('heroicon-m-ticket')
                ->color('primary'),
        ];
    }
}
