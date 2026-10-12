<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scores', function (Blueprint $table) {
            $table->id();
            // Null for guests and for scores imported from the old JSON file
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 20);
            $table->unsignedInteger('score');
            $table->unsignedSmallInteger('level')->default(1);
            $table->unsignedInteger('game_time')->default(0);
            $table->unsignedSmallInteger('dragonstalker_completions')->default(0);
            $table->decimal('final_crit_rating', 5, 1)->default(0);
            $table->decimal('final_dodge_rating', 5, 1)->default(0);
            $table->timestamps();

            $table->index('score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scores');
    }
};
