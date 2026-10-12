<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // The player has found the large quiver, which doubles the arrows they can carry
            $table->boolean('quiver')->default(false);
        });

        Schema::table('boss_drops', function (Blueprint $table) {
            // The large quiver came with this drop
            $table->boolean('quiver')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('boss_drops', function (Blueprint $table) {
            $table->dropColumn('quiver');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('quiver');
        });
    }
};
