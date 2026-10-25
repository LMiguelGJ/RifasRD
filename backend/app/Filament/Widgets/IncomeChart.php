<?php

namespace App\Filament\Widgets;

use App\Enums\OrderStatus;
use App\Models\Order;
use Filament\Widgets\ChartWidget as BaseWidget;
use Illuminate\Support\Facades\DB;

class IncomeChart extends BaseWidget
{
    protected static ?int $sort = 3;

    protected int | string | array $columnSpan = 'full';

    protected static ?string $heading = 'Ingresos (últimos 30 días)';

    protected function getData(): array
    {
        $days = collect(range(29, 0))->map(fn (int $ago) => now()->subDays($ago)->startOfDay());

        $totals = Order::where('status', OrderStatus::Validated)
            ->where('validated_at', '>=', now()->subDays(30)->startOfDay())
            ->get(['total_amount', 'validated_at'])
            ->groupBy(fn (Order $order) => $order->validated_at->format('Y-m-d'))
            ->map(fn ($orders) => (float) $orders->sum('total_amount'));

        return [
            'datasets' => [
                [
                    'label' => 'RD$ validados',
                    'data' => $days->map(fn ($day) => $totals[$day->format('Y-m-d')] ?? 0)->all(),
                    'borderColor' => '#c9251a',
                    'backgroundColor' => 'rgba(201, 37, 26, 0.12)',
                    'fill' => true,
                ],
            ],
            'labels' => $days->map(fn ($day) => $day->format('d/m'))->all(),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
