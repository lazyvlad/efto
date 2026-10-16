<?php

namespace App\Support;

use GdImage;

/**
 * The picture under a game's card on Discord (App\Support\DiscordFeed): the bosses brought
 * down in a row, in the order they fell, and under them the best loot, each in a frame of its
 * rarity's colour. Drawn with GD from the game's own pictures; a PNG with a see-through
 * background, so it sits on the card in either Discord theme.
 */
class GameCardImage
{
    /** At most this many of each in their row */
    public const MOST = 10;

    private const CELL = 72;        // A boss's or an item's square

    private const GAP = 8;

    private const FRAME = 3;        // An item's frame, in its rarity's colour

    private const RARITY = ['legendary' => [255, 128, 0], 'epic' => [163, 53, 238], 'rare' => [0, 112, 221]];

    /**
     * The picture, as PNG bytes, or null when there is neither a boss nor loot to show (or GD
     * cannot read the pictures).
     *
     * @param  array<int, string>  $bossImages  Paths in the game's folder, in order
     * @param  array<int, array{image: ?string, rarity: string}>  $loot  Rarest first
     */
    public static function png(array $bossImages, array $loot): ?string
    {
        $bosses = array_values(array_filter(array_map(fn ($path) => self::picture($path), array_slice($bossImages, 0, self::MOST))));
        $items = [];
        foreach (array_slice($loot, 0, self::MOST) as $item) {
            if ($picture = self::picture($item['image'] ?? null)) {
                $items[] = ['picture' => $picture, 'rarity' => $item['rarity']];
            }
        }
        if ($bosses === [] && $items === []) {
            return null;
        }

        $columns = max(count($bosses), count($items));
        $rows = ($bosses !== [] ? 1 : 0) + ($items !== [] ? 1 : 0);
        $width = $columns * self::CELL + ($columns - 1) * self::GAP;
        $height = $rows * self::CELL + ($rows - 1) * self::GAP;

        $canvas = imagecreatetruecolor($width, $height);
        imagealphablending($canvas, false);
        imagefill($canvas, 0, 0, imagecolorallocatealpha($canvas, 0, 0, 0, 127));
        imagesavealpha($canvas, true);
        imagealphablending($canvas, true);

        $y = 0;
        if ($bosses !== []) {
            foreach ($bosses as $i => $picture) {
                self::fit($canvas, $picture, $i * (self::CELL + self::GAP), $y, self::CELL);
            }
            $y += self::CELL + self::GAP;
        }
        foreach ($items as $i => $item) {
            $x = $i * (self::CELL + self::GAP);
            [$r, $g, $b] = self::RARITY[$item['rarity']] ?? [128, 128, 128];
            // A dark well inside a frame of the rarity's colour, the icon inside
            imagefilledrectangle($canvas, $x, $y, $x + self::CELL - 1, $y + self::CELL - 1, imagecolorallocate($canvas, $r, $g, $b));
            $inner = self::FRAME;
            imagefilledrectangle($canvas, $x + $inner, $y + $inner, $x + self::CELL - 1 - $inner, $y + self::CELL - 1 - $inner, imagecolorallocate($canvas, 24, 22, 28));
            self::fit($canvas, $item['picture'], $x + $inner + 2, $y + $inner + 2, self::CELL - 2 * $inner - 4);
        }

        ob_start();
        imagepng($canvas, null, 6);

        return ob_get_clean() ?: null;
    }

    /** A picture from the game's folder ("assets/…", a ?v= left off), or null */
    private static function picture(?string $path): ?GdImage
    {
        if (! $path) {
            return null;
        }
        $file = base_path('game/'.ltrim(strtok($path, '?'), '/'));
        if (! is_file($file)) {
            return null;
        }
        $picture = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'webp' => @imagecreatefromwebp($file),
            'png' => @imagecreatefrompng($file),
            'jpg', 'jpeg' => @imagecreatefromjpeg($file),
            default => false,
        };

        return $picture ?: null;
    }

    /** Drawn into a square, as large as it fits without stretching, centred */
    private static function fit(GdImage $canvas, GdImage $picture, int $x, int $y, int $size): void
    {
        $width = imagesx($picture);
        $height = imagesy($picture);
        $scale = min($size / $width, $size / $height);
        $w = (int) round($width * $scale);
        $h = (int) round($height * $scale);
        imagecopyresampled($canvas, $picture, $x + intdiv($size - $w, 2), $y + intdiv($size - $h, 2), 0, 0, $w, $h, $width, $height);
    }
}
