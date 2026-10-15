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
            // What he wears but is not to be seen in; without it, what was hidden before stays
            'hidden' => ['sometimes', 'array', 'max:'.count(Gear::SLOTS)],
            'hidden.*' => ['string', 'max:60'],
        ]);

        $user = $request->user();
        $side = $data['side'] ?? 'alliance';
        $worn = Gear::valid($user, $data['equipment'], $side);
        $carried = Gear::carried($user, $data['carried'] ?? Gear::carriedFor($user, $side), $worn, $side);
        // Only what is carried can be worn (the clothes a hunter starts in always are)
        // Only what he has with him can be worn (worn, it takes no room in his 36)
        $worn = array_filter($worn, fn ($itemId) => in_array($itemId, $carried, true));

        // Kept even when empty: a player who took everything off chose to. The other hunter's
        // outfit stays as it was (an outfit saved before there were two becomes both).
        $all = Gear::allEquipment($user);
        $all[$side] = $worn;
        // And what each carries: this one's as chosen now, the other's as it was
        $allCarried = Gear::allCarried($user);
        $allCarried[$side] = $carried;
        $hidden = Gear::allHidden($user);
        if (array_key_exists('hidden', $data)) {
            $hidden[$side] = array_values(array_unique($data['hidden']));
        }
        $user->forceFill([
            'equipment' => array_map(fn ($outfit) => $outfit === null ? null : (object) $outfit, $all),
            'carried' => array_key_exists('carried', $data) || $user->carried !== null ? $allCarried : null,
            'hidden_gear' => $hidden,
        ])->save();

        // What binds when worn is his now
        Gear::bindWorn($user, $side, $worn);

        return response()->json(['equipment' => (object) $worn, 'side' => $side, 'carried' => $carried, 'hidden' => $hidden[$side]]);
    }

    /**
     * Send gear that binds when worn to the other hunter: only copies not yet worn. What the
     * sender no longer has is no longer worn or carried by him.
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item' => ['required', 'string', 'max:60'],
            'count' => ['required', 'integer', 'min:1', 'max:1000'],
            'side' => ['required', 'in:alliance,horde'],
        ]);

        $user = $request->user();
        $refused = Gear::send($user, $data['side'], $data['item'], (int) $data['count']);
        abort_if($refused !== null, 422, (string) $refused);

        // What he no longer has comes off him
        $user = $user->fresh();
        $all = Gear::allEquipment($user);
        foreach ($all as $hunter => $chosen) {
            $all[$hunter] = $chosen === null ? null : (object) Gear::valid($user, $chosen, $hunter);
        }
        if ($user->equipment !== null) {
            $user->forceFill(['equipment' => $all])->save();
        }

        return response()->json([
            'gear' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => (object) Gear::owned($user, $side)])->all(),
            'bound' => collect(Gear::SIDES)->mapWithKeys(fn ($side) => [$side => (object) Gear::bound($user, $side)])->all(),
            'equipment' => $user->fresh()->equipment,
        ]);
    }
}
