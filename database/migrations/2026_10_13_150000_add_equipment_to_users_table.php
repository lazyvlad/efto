<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What a player's hunter is wearing: the item in each slot of the character sheet. Kept on
     * the account, so it is the same on every device.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('equipment')->nullable()->after('granted_pieces');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('equipment');
        });
    }
};
