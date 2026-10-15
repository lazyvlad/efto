<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * The Horde hunter's starter weapon was a cleaver for a while (3.0.17, on the
     * development site only); it is a handaxe now. Outfits, saved sets and hidden gear that
     * name the cleaver name the handaxe.
     */
    public function up(): void
    {
        User::query()->where(function ($users) {
            foreach (['equipment', 'outfits', 'hidden_gear'] as $column) {
                $users->orWhere($column, 'like', '%starter-horde-cleaver%');
            }
        })->each(function (User $user) {
            foreach (['equipment', 'outfits', 'hidden_gear'] as $column) {
                if ($user->{$column} === null) {
                    continue;
                }
                $json = json_encode($user->{$column});
                if (str_contains($json, 'starter-horde-cleaver')) {
                    $user->forceFill([$column => json_decode(str_replace('starter-horde-cleaver', 'starter-horde-handaxe', $json), true)]);
                }
            }
            $user->save();
        });
    }

    public function down(): void
    {
        // The cleaver is gone: nothing to go back to
    }
};
