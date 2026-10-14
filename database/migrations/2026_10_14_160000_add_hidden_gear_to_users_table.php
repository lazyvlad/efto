<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The gear a player chose not to see on each hunter: it is still worn and still counts,
     * but is not drawn on him. { alliance: [item ids], horde: [item ids] }.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('hidden_gear')->nullable()->after('outfits');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('hidden_gear');
        });
    }
};
