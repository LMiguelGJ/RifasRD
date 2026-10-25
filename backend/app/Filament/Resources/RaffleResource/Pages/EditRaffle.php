<?php

namespace App\Filament\Resources\RaffleResource\Pages;

use App\Filament\Resources\RaffleResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditRaffle extends EditRecord
{
    protected static string $resource = RaffleResource::class;

    protected ?bool $hasDatabaseTransactions = true;

    protected function beforeSave(): void
    {
        // Filament saves repeater relationships before the parent update. Publish
        // the validated limits inside this page's transaction so package model
        // validation sees the new bounds. Any later error rolls back both.
        $this->getRecord()->newQuery()->whereKey($this->getRecord()->getKey())->update([
            'min_tickets_per_user' => $this->data['min_tickets_per_user'],
            'max_tickets_per_user' => $this->data['max_tickets_per_user'],
        ]);
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        return RaffleResource::bindBanner($data);
    }

    /**
     * The "current photo" preview reads the loaded record, whose cached relations
     * still point at the old image. Reload it so the page shows what was just saved.
     */
    protected function afterSave(): void
    {
        $this->record->refresh();
        $this->record->unsetRelation('image');
        $this->fillForm();
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()
                ->label('Retirar rifa')
                ->modalHeading('Retirar rifa del catálogo')
                ->modalDescription('La rifa dejará de aparecer en el catálogo y no aceptará nuevas compras. Los pedidos, boletos, ganadores y enlaces existentes se conservarán para consulta histórica.')
                ->modalSubmitActionLabel('Retirar rifa'),
        ];
    }
}
