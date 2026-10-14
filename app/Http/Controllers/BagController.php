<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Bags;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bags, bought with coins and added to the backpack: more room for what a game's catch.
 */
class BagController extends Controller
{
    /**
     * Buy a bag. With every bag slot taken, it takes the place of the smallest bag, if it is
     * bigger than that one.
     */
    public function buy(Request $request): JsonResponse
    {
        $forSale = config('loot.bags.for_sale');

        $data = $request->validate([
            'size' => ['required', 'integer', 'in:'.implode(',', array_keys($forSale))],
        ]);

        $user = $request->user();
        abort_unless($user->canUseRewards(), 422, 'Activate your account to spend coins.');

        $size = (int) $data['size'];
        $bags = $user->bags ?? [];
        sort($bags);

        if (count($bags) >= (int) config('loot.bags.bag_slots')) {
            abort_if($size <= $bags[0], 422, 'Every bag you have is at least that big.');
            array_shift($bags);
        }

        // Only taken if the purse still holds that much
        $paid = User::whereKey($user->id)->where('coins', '>=', $forSale[$size])->decrement('coins', $forSale[$size]);
        abort_if($paid === 0, 422, 'Not enough coins.');

        $bags[] = $size;
        rsort($bags);
        $user->forceFill(['bags' => $bags])->save();

        return response()->json([
            'bags' => $bags,
            'capacity' => Bags::capacity($user),
            'coins' => (int) $user->fresh()->coins,
        ]);
    }
}
