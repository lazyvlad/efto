<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A guest's hunters are kept on an account of their own with no email or password, known
     * by a key the guest's browser holds (App\Support\GuestHunter): what a guest finds is his
     * for as long as the browser keeps the key, and comes along when the guest signs up.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_guest')->default(false)->index()->after('is_admin');
            // The hash of the key in the guest's browser
            $table->string('guest_key', 64)->nullable()->unique()->after('is_guest');
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['guest_key']);
            $table->dropIndex(['is_guest']);
            $table->dropColumn(['is_guest', 'guest_key']);
        });
    }
};
