<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The bags a player has bought to add to the backpack (their sizes, in slots), and the
     * crafting materials they have brought back from their games (how many of each).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('bags')->nullable()->after('equipment');
            $table->json('materials')->nullable()->after('bags');
        });

        // The materials a game brought back
        Schema::table('games', function (Blueprint $table) {
            $table->json('materials')->nullable()->after('gear');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['bags', 'materials']);
        });

        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('materials');
        });
    }
};
