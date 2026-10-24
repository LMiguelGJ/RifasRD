<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

/**
 * Resolves a stored voucher to an absolute path, guaranteeing it stays inside
 * the local disk root (a tampered voucher_path can never reach other files).
 */
final class VoucherPath
{
    public static function resolve(?string $relative): string
    {
        $disk = Storage::disk('local');
        $root = realpath($disk->path(''));
        $full = ($relative !== null && $relative !== '') ? realpath($disk->path($relative)) : false;

        abort_if(
            $root === false
            || $full === false
            || ! str_starts_with($full, $root . DIRECTORY_SEPARATOR)
            || ! is_file($full),
            404,
        );

        return $full;
    }
}
