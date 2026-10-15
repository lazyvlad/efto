<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A boss fight the game ended in, lost or left, as the game reported it: { boss, seconds,
     * bossHealth (the share it had left), arrows, damage, hits }. Shown after the bosses that
     * went down; null for a game that did not end in a fight.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->json('last_fight')->nullable()->after('gear');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropColumn('last_fight');
        });
    }
};
