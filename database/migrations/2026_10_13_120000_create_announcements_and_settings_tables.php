<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What admins have sent to all players, and the game settings they have changed.
     */
    public function up(): void
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject');
            $table->text('body');
            $table->string('button_text')->nullable();
            $table->string('button_url')->nullable();
            $table->unsignedInteger('sent_to')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->timestamps();
        });

        // One row for each setting that differs from the game's own value (config/game_settings.php)
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 80)->primary();
            $table->double('value');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
        Schema::dropIfExists('announcements');
    }
};
