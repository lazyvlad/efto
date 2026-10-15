<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * For Live games: when the server last heard from a game being played, and how it was going
     * then, as the game said ({ score, level, boss, bossHealth }). Shown, never relied on.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dateTime('last_seen_at')->nullable()->after('ended_at')->index();
            $table->json('live')->nullable()->after('last_seen_at');
        });
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['last_seen_at']);
            $table->dropColumn(['last_seen_at', 'live']);
        });
    }
};
