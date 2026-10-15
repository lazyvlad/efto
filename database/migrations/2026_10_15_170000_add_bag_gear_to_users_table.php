<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Gear a hunter keeps in his bags besides his 36, a slot a piece, each hunter his own:
     * { alliance: [itemId, ...], horde: [...] } (App\Support\Gear::bagGear).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('bag_gear')->nullable()->after('bag_contents');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('bag_gear');
        });
    }
};
