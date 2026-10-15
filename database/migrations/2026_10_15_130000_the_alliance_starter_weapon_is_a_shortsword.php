<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * The Alliance hunter's starter weapon was a skinning knife for a while (3.0.17, on the
     * development site only); it is a shortsword now. Outfits, saved sets and hidden gear that
     * name the knife name the sword.
     */
    public function up(): void
    {
        User::query()->where(function ($users) {
            foreach (['equipment', 'outfits', 'hidden_gear'] as $column) {
                $users->orWhere($column, 'like', '%starter-alliance-knife%');
            }
        })->each(function (User $user) {
            foreach (['equipment', 'outfits', 'hidden_gear'] as $column) {
                if ($user->{$column} === null) {
                    continue;
                }
                $json = json_encode($user->{$column});
                if (str_contains($json, 'starter-alliance-knife')) {
                    $user->forceFill([$column => json_decode(str_replace('starter-alliance-knife', 'starter-alliance-shortsword', $json), true)]);
                }
            }
            $user->save();
        });
    }

    public function down(): void
    {
        // The knife is gone: nothing to go back to
    }
};
