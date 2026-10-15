<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Debug mode's measurements (the game's utils/perfProbe.js): every few seconds of play, how
     * the game ran in a player's browser, for Admin → Performance. One recording session is all
     * the samples sent from one page load.
     */
    public function up(): void
    {
        Schema::create('perf_samples', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session', 40)->index();
            $table->string('game_version', 20)->nullable();
            // The browser and its machine, as the game read them
            $table->json('device')->nullable();
            // Frame rate and frame times, where the time went, what was on screen and happening
            $table->json('sample');
            $table->timestamp('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('perf_samples');
    }
};
