<?php

namespace App\Http\Controllers;

use App\Support\Gear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The sets a player saves on the character sheet: a name and what is worn in each slot. They
 * are kept as they were saved; putting one on goes through what the player owns and carries
 * at that moment (the game, and EquipmentController when it is saved as worn).
 */
class OutfitController extends Controller
{
    /** How many sets a player can keep */
    public const MOST = 4;

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'outfits' => ['present', 'array', 'max:'.self::MOST],
            'outfits.*.name' => ['required', 'string', 'max:24'],
            'outfits.*.equipment' => ['present', 'array', 'max:'.count(Gear::SLOTS)],
            'outfits.*.equipment.*' => ['nullable', 'string', 'max:60'],
        ]);

        $outfits = array_map(fn ($outfit) => [
            'name' => trim($outfit['name']),
            // Only the sheet's slots, and only names of things
            'equipment' => (object) array_filter(
                array_intersect_key($outfit['equipment'], array_flip(Gear::SLOTS)),
                fn ($itemId) => is_string($itemId) && $itemId !== ''
            ),
        ], $data['outfits']);

        $request->user()->forceFill(['outfits' => $outfits])->save();

        return response()->json(['outfits' => $outfits]);
    }
}
