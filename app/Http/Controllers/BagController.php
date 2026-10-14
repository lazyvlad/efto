<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\Bags;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Bags, bought with coins and added to the backpack: more room for what a game's catch. And
 * what is kept in them between games: materials moved there from the bank (and back), and
 * what is crafted from them (App\Support\Bags).
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

    /**
     * Move a stack of something kept between the bank and the bags, between games.
     */
    public function move(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item' => ['required', 'string', 'max:60'],
            'count' => ['required', 'integer', 'min:1', 'max:100000'],
            'to' => ['required', 'in:bags,bank'],
            'side' => ['sometimes', 'in:alliance,horde'],
        ]);
        abort_unless(Bags::keepable($data['item']), 422, 'That is not kept in the bags.');

        $user = $request->user();
        $side = $data['side'] ?? 'alliance';
        $refused = Bags::move($user, $side, $data['item'], (int) $data['count'], $data['to'] === 'bags');
        abort_if($refused !== null, 422, (string) $refused);

        return response()->json(self::kept($user, $side));
    }

    /**
     * Send a kept thing (a material, a potion, arrows) from one hunter's bank to the other's,
     * between games: they are not bound to either.
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item' => ['required', 'string', 'max:60'],
            'count' => ['required', 'integer', 'min:1', 'max:100000'],
            'side' => ['required', 'in:alliance,horde'],
        ]);
        abort_unless(Bags::keepable($data['item']), 422, 'That cannot be sent.');

        $user = $request->user();
        $refused = Bags::send($user, $data['side'], $data['item'], (int) $data['count']);
        abort_if($refused !== null, 422, (string) $refused);

        return response()->json(self::kept($user, $data['side']));
    }

    /**
     * Craft so many of a recipe from what is in the bags (config/crafting.php).
     */
    public function craft(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recipe' => ['required', 'string', 'in:'.implode(',', array_keys(config('crafting.recipes')))],
            'count' => ['required', 'integer', 'min:1', 'max:1000'],
            'side' => ['sometimes', 'in:alliance,horde'],
        ]);

        $user = $request->user();
        $side = $data['side'] ?? 'alliance';
        $refused = Bags::craft($user, $side, $data['recipe'], (int) $data['count']);
        abort_if($refused !== null, 422, (string) $refused);

        return response()->json(self::kept($user, $side));
    }

    /** What is in a hunter's bags and bank now, and both hunters' (for a send) */
    private static function kept(User $user, string $side): array
    {
        $user->refresh();

        return ['side' => $side, 'bags' => (object) Bags::contents($user, $side), 'bank' => (object) Bags::bank($user, $side)] + ['all' => Bags::allKept($user)];
    }
}
