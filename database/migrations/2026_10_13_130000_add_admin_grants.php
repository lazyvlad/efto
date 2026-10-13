<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What an admin gave a player, kept apart from what they earned so it can be taken back:
     * pieces of the hunter sets, and boss loot (which is what opens the later zones).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('granted_pieces')->nullable()->after('quiver');
        });

        Schema::table('boss_drops', function (Blueprint $table) {
            $table->boolean('granted')->default(false)->after('quiver');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('granted_pieces');
        });

        Schema::table('boss_drops', function (Blueprint $table) {
            $table->dropColumn('granted');
        });
    }
};
