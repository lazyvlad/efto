<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class Avatar
{
    // Stored size in pixels (square). Shown much smaller; this leaves room for sharp screens.
    public const SIZE = 256;

    /**
     * Store an uploaded picture as the user's profile image. Whatever was uploaded is redrawn
     * as a square WebP, so nothing but pixels survives from the original file.
     */
    public static function store(User $user, UploadedFile $file): void
    {
        $source = @imagecreatefromstring($file->getContent());

        if ($source === false) {
            throw new RuntimeException('The uploaded file is not a readable image.');
        }

        // The page crops to a square before uploading; anything else is cropped around its centre
        $width = imagesx($source);
        $height = imagesy($source);
        $side = min($width, $height);

        $image = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagefill($image, 0, 0, imagecolorallocate($image, 0x1b, 0x17, 0x14));
        imagecopyresampled(
            $image, $source,
            0, 0, intdiv($width - $side, 2), intdiv($height - $side, 2),
            self::SIZE, self::SIZE, $side, $side
        );

        ob_start();
        imagewebp($image, null, 85);
        $webp = ob_get_clean();

        // A new name each time, so browsers never show a cached copy of the old picture
        $path = 'avatars/'.$user->id.'-'.Str::lower(Str::random(12)).'.webp';
        Storage::disk('public')->put($path, $webp);

        $old = $user->avatar;
        $user->forceFill(['avatar' => $path])->save();

        if ($old) {
            Storage::disk('public')->delete($old);
        }
    }

    public static function remove(User $user): void
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->forceFill(['avatar' => null])->save();
        }
    }
}
