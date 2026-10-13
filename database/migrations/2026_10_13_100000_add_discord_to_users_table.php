<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A Discord account connected to a player's account: connecting one activates it.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('discord_id', 32)->nullable()->unique()->after('email_verified_at');
            $table->string('discord_name')->nullable()->after('discord_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['discord_id']);
            $table->dropColumn(['discord_id', 'discord_name']);
        });
    }
};
