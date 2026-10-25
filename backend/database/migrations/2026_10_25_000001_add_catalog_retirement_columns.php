<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_combos', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('raffles', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('bank_accounts', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        // Retirement timestamps are additive and intentionally survive rollback.
    }
};
