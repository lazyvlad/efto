<?php

use App\Models\Game;
use App\Models\Score;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Games and scores brought over from a guest session kept the name they were played under
     * (a guest's random name, or one he typed). From 3.5.7 they take the account's name as they
     * come over (App\Support\GuestHunter); this puts those brought over before under it too.
     * Every registered account's games and scores are shown under its name as it is now, which
     * also renames those of a player who has since changed his name.
     */
    public function up(): void
    {
        User::where('is_guest', false)->select(['id', 'name'])->chunkById(200, function ($users) {
            foreach ($users as $user) {
                Game::where('user_id', $user->id)->where('name', '!=', $user->name)->update(['name' => $user->name]);
                Score::where('user_id', $user->id)->where('name', '!=', $user->name)->update(['name' => $user->name]);
            }
        });
    }

    /** The names they had are not kept: there is nothing to go back to */
    public function down(): void
    {
    }
};
