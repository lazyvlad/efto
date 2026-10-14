<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The gear a player's hunter takes into a game, out of everything they own: a list of
     * item ids, no longer than config('gear.carry'). Null until they have chosen.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('carried')->nullable()->after('equipment');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('carried');
        });
    }
};
