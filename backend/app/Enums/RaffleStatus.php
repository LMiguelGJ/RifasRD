<?php

namespace App\Enums;

enum RaffleStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Paused = 'paused';
    case Finished = 'finished';
}
