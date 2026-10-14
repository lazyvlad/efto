<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gear an admin gave each hunter (App\Support\Grants), apart from what he found, so it can
     * be taken back: { alliance: { itemId: count }, horde: {...} }. The large quiver given is
     * kept here too.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('granted_gear')->nullable()->after('granted_pieces');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('granted_gear');
        });
    }
};
