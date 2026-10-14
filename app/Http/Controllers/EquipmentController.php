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
     * that is not theirs, or does not fit where they put it, is left out. With it can come
     * what the hunter takes into a game (Gear::carried).
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'equipment' => ['present', 'array', 'max:'.count(Gear::SLOTS)],
            // What the hunter takes into a game; without it, what was chosen before stays
            'carried' => ['sometimes', 'array', 'max:200'],
            'carried.*' => ['string', 'max:60'],
        ]);

        $user = $request->user();
        $worn = Gear::valid($user, $data['equipment']);
        $carried = Gear::carried($user, $data['carried'] ?? $user->carried, $worn);
        // Only what is carried can be worn
        $worn = array_filter($worn, fn ($itemId) => in_array($itemId, $carried, true));

        // Kept even when empty: a player who took everything off chose to
        $user->forceFill([
            'equipment' => $worn,
            'carried' => array_key_exists('carried', $data) || $user->carried !== null ? $carried : null,
        ])->save();

        return response()->json(['equipment' => (object) $worn, 'carried' => $carried]);
    }
}
