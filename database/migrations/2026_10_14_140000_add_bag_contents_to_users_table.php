<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * What is in the hunter's bags between games: { itemId: count }. Materials and what is
     * crafted from them stay in the bags from one game to the next (App\Support\Bags); the
     * bank (users.materials) holds the rest, without limit.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('bag_contents')->nullable()->after('bags');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('bag_contents');
        });
    }
};
