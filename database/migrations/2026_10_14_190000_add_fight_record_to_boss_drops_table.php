<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * How the fight with a boss went, as the game reported it with the kill, for the player's
     * record on My Games: how long it took, the points it paid (and of them, for speed, against
     * its par time), the arrows spent, and the damage and hits taken. As the browser says;
     * shown to the player, never used to decide anything. Null for kills before this was kept.
     */
    public function up(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            $table->decimal('fight_seconds', 6, 1)->nullable()->after('dropped_at');
            $table->unsignedInteger('points')->nullable()->after('fight_seconds');
            $table->unsignedInteger('speed_points')->nullable()->after('points');
            $table->unsignedSmallInteger('par_seconds')->nullable()->after('speed_points');
            $table->unsignedInteger('arrows_used')->nullable()->after('par_seconds');
            $table->unsignedInteger('damage_taken')->nullable()->after('arrows_used');
            $table->unsignedSmallInteger('hits_taken')->nullable()->after('damage_taken');
        });
    }

    public function down(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            $table->dropColumn(['fight_seconds', 'points', 'speed_points', 'par_seconds', 'arrows_used', 'damage_taken', 'hits_taken']);
        });
    }
};
