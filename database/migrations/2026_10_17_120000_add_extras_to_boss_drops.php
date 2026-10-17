<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            // The zone's gear an early boss dropped besides its item (boss_loot.extras), by id.
            // A record only: they are owned as the game's own drops (game_drops), like the gear
            // its creatures carry
            $table->json('extras')->nullable()->after('bag');
        });
    }

    public function down(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            $table->dropColumn('extras');
        });
    }
};
