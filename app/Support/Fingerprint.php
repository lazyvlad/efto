<?php

namespace App\Support;

/**
 * Addresses of files whose names never change (the logo, the icons, the share card) with a
 * short fingerprint of their contents after them: "input-logo.webp?v=3f9a2c1d". A browser
 * keeps such a file as long as it likes under one address; when the file changes, so does
 * the fingerprint, and with it the address, so every browser fetches the new one.
 */
class Fingerprint
{
    /** @var array<string, string> */
    private static array $known = [];

    /** The file's fingerprint, or '' if there is no such file */
    public static function of(string $file): string
    {
        if (! array_key_exists($file, self::$known) || app()->runningUnitTests()) {
            self::$known[$file] = is_file($file) ? substr(md5_file($file), 0, 8) : '';
        }

        return self::$known[$file];
    }

    /** asset() for a file under public/, fingerprinted */
    public static function asset(string $path): string
    {
        $version = self::of(public_path($path));

        return asset($path).($version !== '' ? '?v='.$version : '');
    }
}
