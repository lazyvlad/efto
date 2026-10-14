<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Gear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Selling gear for coins. Only one of a thing can be worn, so the rest are worth more sold;
 * the last one can be sold too, and is then no longer the player's to wear.
 */
class VendorController extends Controller
{
    public function sell(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item' => ['required', 'string', 'max:60'],
            'count' => ['required', 'integer', 'min:1', 'max:10000'],
            // Whose: each hunter sells only what is his
            'side' => ['sometimes', 'in:alliance,horde'],
        ]);
        $side = $data['side'] ?? 'alliance';

        $user = $request->user();
        abort_unless($user->canUseRewards(), 422, 'Activate your account to sell things.');

        $item = Gear::catalog()[$data['item']] ?? null;
        $have = Gear::owned($user, $side)[$data['item']] ?? 0;
        abort_if($item === null || $have < 1, 422, 'You do not have that.');
        // The clothes a hunter starts in are his for good
        abort_if(Gear::isStarter($data['item']), 422, 'Those are your hunter\'s own clothes: they are not for sale.');

        // No more than there are
        $count = min((int) $data['count'], $have);

        $sold = Gear::allSold($user);
        $mine = (array) $sold[$side];
        $mine[$data['item']] = ($mine[$data['item']] ?? 0) + $count;
        $sold[$side] = (object) $mine;
        $user->forceFill(['sold' => $sold])->save();
        User::whereKey($user->id)->increment('coins', $count * $item['value']);

        // The last one sold is no longer worn
        $user = $user->fresh();
        $equipment = Gear::allEquipment($user);
        foreach ($equipment as $hunter => $chosen) {
            $equipment[$hunter] = $chosen === null ? null : (object) Gear::valid($user, $chosen, $hunter);
        }
        if ($user->equipment !== null) {
            $user->forceFill(['equipment' => $equipment])->save();
        }

        return response()->json([
            'sold' => $count,
            'paid' => $count * $item['value'],
            'coins' => (int) $user->coins,
            'side' => $side,
            'gear' => (object) Gear::owned($user, $side),
            'equipment' => $equipment,
        ]);
    }
}
