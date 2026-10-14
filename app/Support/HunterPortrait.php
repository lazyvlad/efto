<?php

namespace App\Support;

/**
 * The painted portraits of the two hunters in their starting outfits (public/images/hunters):
 * a small WebP for the site, and a JPEG on a dark ground for Discord.
 */
class HunterPortrait
{
    /** The site's portrait of the side's hunter, or null for no or an unknown side */
    public static function url(?string $side): ?string
    {
        return self::known($side) ? Fingerprint::asset('images/hunters/'.$side.'-portrait.webp') : null;
    }

    /** The portrait to show off the site, as on Discord */
    public static function thumbnailUrl(?string $side): ?string
    {
        return self::known($side) ? Fingerprint::asset('images/hunters/'.$side.'-portrait.jpg') : null;
    }

    private static function known(?string $side): bool
    {
        return in_array($side, ['alliance', 'horde'], true);
    }
}
