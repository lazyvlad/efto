<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Every game played, opened by the server when the game starts
        Schema::create('games', function (Blueprint $table) {
            $table->id();
            // What the browser knows the game by
            $table->string('token', 40)->unique();
            // Null for guests
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 20);
            // open, finished (played to the end) or abandoned (left, closed or crashed mid-game)
            $table->string('status', 10)->default('open');
            // The game lost the server and carried on with its own random loot; it does not count
            $table->boolean('offline')->default(false);
            $table->unsignedSmallInteger('chunks_issued')->default(0);
            $table->unsignedInteger('score')->default(0);
            $table->unsignedSmallInteger('level')->default(1);
            $table->unsignedInteger('game_time')->default(0);
            $table->unsignedSmallInteger('dragonstalker_completions')->default(0);
            $table->decimal('final_crit_rating', 5, 1)->default(0);
            $table->decimal('final_dodge_rating', 5, 1)->default(0);
            // Pickup counts as the browser reported them, by item id. The rare ones the server
            // can vouch for are the claimed rows in game_drops.
            $table->json('items')->nullable();
            $table->string('game_version', 20)->nullable();
            // dateTime, not timestamp: MySQL would move a timestamp to "now" on every update of the row
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        // A game's loot table: the rare items the server offered it, and which were picked up
        Schema::create('game_drops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->string('item_id', 40);
            $table->unsignedSmallInteger('chunk');
            // Seconds of play into the game at which the item appears
            $table->unsignedInteger('at_seconds');
            $table->dateTime('claimed_at')->nullable();

            $table->index(['game_id', 'chunk']);
            $table->index(['item_id', 'claimed_at']);
        });

        Schema::table('scores', function (Blueprint $table) {
            // Null for scores from before games were recorded
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('scores', function (Blueprint $table) {
            $table->dropConstrainedForeignId('game_id');
        });
        Schema::dropIfExists('game_drops');
        Schema::dropIfExists('games');
    }
};
