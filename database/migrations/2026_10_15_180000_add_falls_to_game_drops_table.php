<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A piece of a zone's own gear offered to fall from the sky, where the rest of them are
     * carried by the zone's creatures (App\Models\Game::skyGear).
     */
    public function up(): void
    {
        Schema::table('game_drops', function (Blueprint $table) {
            $table->boolean('falls')->default(false)->after('at_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('game_drops', function (Blueprint $table) {
            $table->dropColumn('falls');
        });
    }
};
