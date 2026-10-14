<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The sets a player saved on the character sheet: a name and what is worn in each slot,
     * put on again in one press. A list of { name, equipment }.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('outfits')->nullable()->after('carried');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('outfits');
        });
    }
};
