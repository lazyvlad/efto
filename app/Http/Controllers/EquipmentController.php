<?php

namespace App\Http\Controllers;

use App\Support\Gear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What a logged-in player's hunter is wearing, as the character sheet in the game sets it.
 */
class EquipmentController extends Controller
{
    /**
     * Put on what the player chose. What comes back is what they are now wearing: anything
     * that is not theirs, or does not fit where they put it, is left out.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment' => ['present', 'array', 'max:'.count(Gear::SLOTS)],
            'equipment.*' => ['nullable', 'string', 'max:60'],
        ]);

        $user = $request->user();
        $worn = Gear::valid($user, $data['equipment']);
        // Kept even when empty: a player who took everything off chose to
        $user->forceFill(['equipment' => $worn])->save();

        return response()->json(['equipment' => (object) $worn]);
    }
}
