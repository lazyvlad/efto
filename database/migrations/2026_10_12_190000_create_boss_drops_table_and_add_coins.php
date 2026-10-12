<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // What each defeated boss dropped (see config/boss_loot.php). A player's boss loot is
        // the rows with their user_id; a guest's rows only record that the boss fell.
        Schema::create('boss_drops', function (Blueprint $table) {
            $table->id();
            // Loot stays on the account if the game it came from is ever removed
            $table->foreignId('game_id')->nullable()->constrained()->nullOnDelete();
            // Null for guests
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('boss_id', 40);
            $table->string('item_id', 60);
            $table->string('rarity', 10);
            $table->dateTime('dropped_at');

            // A boss drops once in a game
            $table->unique(['game_id', 'boss_id']);
            $table->index(['user_id', 'item_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            // The player's money, in copper
            $table->unsignedBigInteger('coins')->default(0);
        });

        Schema::table('games', function (Blueprint $table) {
            // What the game earned, in copper
            $table->unsignedInteger('coins')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('coins');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('coins');
        });
        Schema::dropIfExists('boss_drops');
    }
};
