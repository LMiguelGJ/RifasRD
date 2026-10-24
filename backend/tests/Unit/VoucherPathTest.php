<?php

namespace Tests\Unit;

use App\Support\VoucherPath;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class VoucherPathTest extends TestCase
{
    public function test_a_stored_voucher_resolves_inside_the_storage_root(): void
    {
        Storage::disk('local')->put('vouchers/guard-test.pdf', 'x');

        $path = VoucherPath::resolve('vouchers/guard-test.pdf');

        $this->assertFileExists($path);
        $this->assertStringStartsWith(realpath(Storage::disk('local')->path('')), $path);

        Storage::disk('local')->delete('vouchers/guard-test.pdf');
    }

    public function test_path_traversal_is_rejected(): void
    {
        $this->expectException(NotFoundHttpException::class);

        VoucherPath::resolve('../../.env');
    }

    public function test_missing_files_and_empty_paths_are_not_found(): void
    {
        $this->expectException(NotFoundHttpException::class);

        VoucherPath::resolve('vouchers/does-not-exist.pdf');
    }
}
