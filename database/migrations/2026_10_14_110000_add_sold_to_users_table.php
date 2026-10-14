<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * How many of each piece of gear a player has sold. What they own is what they have found
     * (boss drops, things caught in games) less this.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('sold')->nullable()->after('materials');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('sold');
        });
    }
};
