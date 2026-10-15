<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            // A piece of the zone's hunter set that came with this drop (boss_loot.set_pieces)
            $table->string('set_piece', 40)->nullable()->after('quiver');
            // A bag that came with it, by its size in slots (boss_loot.bags)
            $table->unsignedTinyInteger('bag')->nullable()->after('set_piece');
        });
    }

    public function down(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            $table->dropColumn(['set_piece', 'bag']);
        });
    }
};
