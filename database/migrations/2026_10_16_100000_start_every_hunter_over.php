<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Everyone starts over (3.4.0): the players so far were testing. Every account, guests and
     * admins too, is back to its hunters' starting clothes: no gear, set pieces, materials, bank,
     * bags bought, coins, large quiver or bosses beaten. Nothing is deleted: the games, the
     * scores and the boss fights stay on record. What a player has counts only from loot_reset_at
     * on (App\Models\User::bossDrops, App\Support\Gear::found); what he had kept on his account
     * besides is cleared here.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Loot found before this is no longer his (null: never started over)
            $table->timestamp('loot_reset_at')->nullable()->after('guest_key');
        });

        DB::table('users')->update([
            'loot_reset_at' => now(),
            'coins' => 0,
            'quiver' => false,
            'bags' => null,
            'bag_contents' => null,
            'bag_gear' => null,
            'materials' => null,
            'equipment' => null,
            'carried' => null,
            'outfits' => null,
            'hidden_gear' => null,
            'gear_ledger' => null,
            'sold' => null,
            'granted_pieces' => null,
            'granted_gear' => null,
        ]);
    }

    /**
     * Only the column goes: what was cleared is not brought back (restore a backup for that).
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('loot_reset_at');
        });
    }
};
