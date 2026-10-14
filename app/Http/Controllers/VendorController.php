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
        ]);

        $user = $request->user();
        abort_unless($user->canUseRewards(), 422, 'Activate your account to sell things.');

        $item = Gear::catalog()[$data['item']] ?? null;
        $have = Gear::owned($user)[$data['item']] ?? 0;
        abort_if($item === null || $have < 1, 422, 'You do not have that.');

        // No more than there are
        $count = min((int) $data['count'], $have);

        $sold = $user->sold ?? [];
        $sold[$data['item']] = ($sold[$data['item']] ?? 0) + $count;
        $user->forceFill(['sold' => $sold])->save();
        User::whereKey($user->id)->increment('coins', $count * $item['value']);

        // The last one sold is no longer worn
        $user = $user->fresh();
        $worn = Gear::worn($user);
        if ($user->equipment !== null && $worn != $user->equipment) {
            $user->forceFill(['equipment' => $worn])->save();
        }

        return response()->json([
            'sold' => $count,
            'paid' => $count * $item['value'],
            'coins' => (int) $user->coins,
            'gear' => (object) Gear::owned($user),
            'equipment' => (object) $worn,
        ]);
    }
}
