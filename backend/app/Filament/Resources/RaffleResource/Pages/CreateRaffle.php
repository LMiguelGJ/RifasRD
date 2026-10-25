<?php

namespace App\Filament\Resources\RaffleResource\Pages;

use App\Filament\Resources\RaffleResource;
use Filament\Resources\Pages\CreateRecord;

class CreateRaffle extends CreateRecord
{
    protected static string $resource = RaffleResource::class;

    protected ?bool $hasDatabaseTransactions = true;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        return RaffleResource::bindBanner($data);
    }
}
