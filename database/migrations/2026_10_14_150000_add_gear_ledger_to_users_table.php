<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gear that binds when it is worn (App\Support\Gear): the copies each hunter sent the other,
     * and the copies each has bound by wearing them. { sent: { alliance, horde }, bound:
     * { alliance, horde } }, each { itemId: count }.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('gear_ledger')->nullable()->after('sold');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('gear_ledger');
        });
    }
};
