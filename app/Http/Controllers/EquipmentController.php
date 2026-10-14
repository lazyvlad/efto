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
            'equipment.*' => ['nullable', 'string', 'max:60'],
            // Which hunter wears it: each has an outfit of its own
            'side' => ['sometimes', 'in:alliance,horde'],
            // What the hunter takes into a game; without it, what was chosen before stays
            'carried' => ['sometimes', 'array', 'max:200'],
            'carried.*' => ['string', 'max:60'],
        ]);

        $user = $request->user();
        $side = $data['side'] ?? 'alliance';
        $worn = Gear::valid($user, $data['equipment'], $side);
        $carried = Gear::carried($user, $data['carried'] ?? Gear::carriedFor($user, $side), $worn, $side);
        // Only what is carried can be worn (the clothes a hunter starts in always are)
        $worn = array_filter($worn, fn ($itemId) => in_array($itemId, $carried, true) || Gear::isStarter($itemId));

        // Kept even when empty: a player who took everything off chose to. The other hunter's
        // outfit stays as it was (an outfit saved before there were two becomes both).
        $all = Gear::allEquipment($user);
        $all[$side] = $worn;
        // And what each carries: this one's as chosen now, the other's as it was
        $allCarried = Gear::allCarried($user);
        $allCarried[$side] = $carried;
        $user->forceFill([
            'equipment' => array_map(fn ($outfit) => $outfit === null ? null : (object) $outfit, $all),
            'carried' => array_key_exists('carried', $data) || $user->carried !== null ? $allCarried : null,
        ])->save();

        return response()->json(['equipment' => (object) $worn, 'side' => $side, 'carried' => $carried]);
    }
}
