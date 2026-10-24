<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug');
            $table->integer('sort_order')->default(0);
        });

        Schema::create('images', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            $table->string('mime_type')->default('image/webp');
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('raffles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories');
            $table->foreignId('image_id')->nullable()->constrained('images');
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('ticket_goal');
            $table->decimal('ticket_price', 10, 2);
            $table->unsignedInteger('max_tickets_per_user')->default(100);
            $table->unsignedInteger('min_tickets_per_user')->default(1);
            $table->unsignedInteger('winners_count')->default(0);
            $table->unsignedTinyInteger('digit_count')->default(5);
            $table->string('status')->default('draft');
            $table->string('type')->default('standard');
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('draw_at')->nullable();
            $table->timestamp('eighty_percent_notified_at')->nullable();
            $table->boolean('show_available_tickets')->default(false);
            $table->boolean('show_ends_at')->default(false);
            $table->json('custom_fields')->nullable();
            $table->unsignedInteger('tickets_sold_count')->default(0);
            $table->timestamps();
        });

        Schema::create('ticket_combos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained('raffles')->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('package_price', 10, 2);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('show_on_public')->default(true);
            $table->string('accent', 10)->default('blue');
            $table->timestamps();
        });

        Schema::create('prize_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained('raffles')->cascadeOnDelete();
            $table->string('number', 10);
            $table->string('prize_label')->nullable();
            $table->decimal('prize_amount', 10, 2)->default(0);
            $table->string('status', 20)->default('available');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->unique(['raffle_id', 'number']);
        });

        Schema::create('participants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('cedula', 20)->nullable();
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->timestamps();
        });

        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name');
            $table->string('account_type')->nullable();
            $table->string('account_number', 40);
            $table->string('account_holder_name');
            $table->string('holder_id', 30)->nullable();
            $table->string('currency', 10)->default('DOP');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('color', 20)->nullable();
            $table->foreignId('image_id')->nullable()->constrained('images');
            $table->timestamps();
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained('raffles');
            $table->foreignId('ticket_combo_id')->nullable()->constrained('ticket_combos');
            $table->foreignId('participant_id')->nullable()->constrained('participants');
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts');
            $table->string('customer_name');
            $table->string('cedula', 20)->nullable();
            $table->string('phone', 30);
            $table->string('email')->nullable();
            $table->unsignedInteger('quantity');
            $table->decimal('total_amount', 10, 2);
            $table->string('status', 30)->default('pending_validation');
            $table->string('customer_slug');
            $table->string('public_view_token', 64)->unique();
            $table->string('voucher_path')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->constrained('raffles');
            $table->foreignId('order_id')->nullable()->constrained('orders');
            $table->foreignId('participant_id')->nullable()->constrained('participants');
            $table->string('number', 10);
            $table->string('status', 20)->default('validated');
            $table->timestamps();
            $table->unique(['raffle_id', 'number']);
        });

        Schema::create('winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('raffle_id')->nullable()->constrained('raffles');
            $table->foreignId('ticket_id')->nullable()->constrained('tickets');
            $table->foreignId('participant_id')->nullable()->constrained('participants');
            $table->foreignId('portrait_image_id')->nullable()->constrained('images');
            $table->string('display_name');
            $table->string('prize_label')->nullable();
            $table->timestamp('drawn_at')->nullable();
            $table->string('winner_type', 20)->default('main');
            $table->string('custom_raffle_title')->nullable();
            $table->string('custom_ticket_number', 10)->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('winners');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('bank_accounts');
        Schema::dropIfExists('participants');
        Schema::dropIfExists('prize_numbers');
        Schema::dropIfExists('ticket_combos');
        Schema::dropIfExists('raffles');
        Schema::dropIfExists('images');
        Schema::dropIfExists('categories');
    }
};
