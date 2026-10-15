<?php

use App\Models\User;
use App\Support\Gear;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * The hunters now start with a weapon (melee needs one in the main hand). Every outfit saved
     * before had nothing there: the side's starter weapon is put in it, once. After this an
     * empty hand is the player's choice, and stays empty.
     */
    public function up(): void
    {
        User::query()->whereNotNull('equipment')->each(function (User $user) {
            $saved = $user->equipment;
            if (! is_array($saved)) {
                return;
            }
            // Saved in the old shape (one outfit for both), the clothes a hunter starts in,
            // the weapon now among them, fill its empty slots as it is read
            $perSide = array_intersect(array_map('strval', array_keys($saved)), Gear::SIDES) !== [];
            if (! $perSide) {
                return;
            }

            $changed = false;
            foreach (Gear::SIDES as $side) {
                if (isset($saved[$side]) && is_array($saved[$side])) {
                    $armed = Gear::withStarterWeapon($saved[$side], $side);
                    if ($armed !== $saved[$side]) {
                        $saved[$side] = $armed;
                        $changed = true;
                    }
                }
            }
            if ($changed) {
                $user->forceFill(['equipment' => $saved])->save();
            }
        });
    }

    public function down(): void
    {
        // The weapons stay: an empty hand cannot be told apart from one emptied on purpose
    }
};
