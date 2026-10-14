<?php

namespace App\Support;

use App\Models\Game;

/**
 * Money, kept in copper: 100 copper is a silver, 100 silver a gold.
 */
class Coins
{
    /**
     * An amount as players read it: "3g 20s 5c".
     */
    public static function format(int $copper): string
    {
        $parts = [];
        if ($copper >= 10000) {
            $parts[] = number_format(intdiv($copper, 10000)).'g';
        }
        if ($copper >= 100 && intdiv($copper, 100) % 100 > 0) {
            $parts[] = (intdiv($copper, 100) % 100).'s';
        }
        if ($copper % 100 > 0 || $parts === []) {
            $parts[] = ($copper % 100).'c';
        }

        return implode(' ', $parts);
    }
}
