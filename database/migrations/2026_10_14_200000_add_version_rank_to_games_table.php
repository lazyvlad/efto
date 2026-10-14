<?php

use App\Models\Game;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The game's version as a number that sorts the way versions do ("3.0.6" is 3000006, after
     * "2.43.0", 2043000), so the high scores can put the latest versions on top. Null for a
     * game with no version.
     */
    public function up(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->unsignedInteger('version_rank')->nullable()->after('game_version')->index();
        });

        DB::table('games')->whereNotNull('game_version')->select('game_version')->distinct()->pluck('game_version')
            ->each(fn ($version) => DB::table('games')->where('game_version', $version)->update(['version_rank' => Game::versionRank($version)]));
    }

    public function down(): void
    {
        Schema::table('games', function (Blueprint $table) {
            $table->dropIndex(['version_rank']);
            $table->dropColumn('version_rank');
        });
    }
};
