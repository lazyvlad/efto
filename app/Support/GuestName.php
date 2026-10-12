<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Random names for people playing without an account, so they can still find themselves
 * on the leaderboard. The name is kept for the length of the browser session.
 */
class GuestName
{
    private const SESSION_KEY = 'guest_name';

    private const ADJECTIVES = [
        'Sleepy', 'Angry', 'Lucky', 'Sneaky', 'Mighty', 'Clumsy', 'Brave', 'Grumpy',
        'Swift', 'Rusty', 'Shiny', 'Hungry', 'Silent', 'Wild', 'Frosty', 'Stormy',
    ];

    private const CREATURES = [
        'Murloc', 'Kobold', 'Gnoll', 'Raptor', 'Tauren', 'Gnome', 'Ogre', 'Imp',
        'Whelp', 'Boar', 'Troll', 'Dwarf', 'Wolf', 'Owl', 'Drake', 'Yeti',
    ];

    public static function forSession(Request $request): string
    {
        $session = $request->session();

        if (! $session->has(self::SESSION_KEY)) {
            $session->put(self::SESSION_KEY, self::generate());
        }

        return $session->get(self::SESSION_KEY);
    }

    public static function generate(): string
    {
        return self::ADJECTIVES[array_rand(self::ADJECTIVES)]
            .self::CREATURES[array_rand(self::CREATURES)]
            .random_int(100, 999);
    }
}
