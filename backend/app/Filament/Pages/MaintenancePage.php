<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use Filament\Forms;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

class MaintenancePage extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-wrench';

    protected static ?string $navigationLabel = 'Mantenimiento';

    protected static ?string $title = 'Mantenimiento';

    protected static ?int $navigationSort = 7;

    protected static string $view = 'filament.pages.maintenance';

    public ?array $data = [];

    public function mount(): void
    {
        $block = Setting::orderBlock();

        $this->form->fill([
            'blocked' => (bool) ($block['blocked'] ?? false),
            'message' => $block['message'] ?? null,
        ]);
    }

    public function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Toggle::make('blocked')
                    ->label('Cerrar el sitio')
                    ->helperText('Cuando está activo, todas las páginas públicas redirigen a /mantenimiento.'),
                Forms\Components\Textarea::make('message')
                    ->label('Mensaje al público')
                    ->rows(3)
                    ->placeholder('Estamos mejorando el sitio. ¡Volvemos pronto!'),
            ])
            ->statePath('data');
    }

    public function save(): void
    {
        $state = $this->form->getState();

        Setting::updateOrCreate(
            ['key' => 'order_block'],
            ['value' => ['blocked' => (bool) $state['blocked'], 'message' => $state['message'] ?? null]],
        );

        Notification::make()
            ->title('Configuración guardada')
            ->success()
            ->send();
    }
}
