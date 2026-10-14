<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The strongest set the hunter wore in a game, with what it gave: a score made with gear
     * is not the same feat as one made without, and the leaderboard says which it was.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->json('gear')->nullable()->after('items');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('gear');
        });
    }
};
