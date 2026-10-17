<?php

use App\Models\NewsPost;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const VERSION = '3.9.0';

    private const TITLE = 'Your pet bites back, and the vendor sells materials';

    /**
     * The What's new post for 3.9.0 (everything since 3.8.0), published as the deploy runs. A
     * post already there for this version (a draft written on a development server) is
     * published as written here instead of added twice.
     */
    public function up(): void
    {
        // Not into the tests' empty databases (tests/Feature/WhatsNewTest.php runs it itself)
        if (app()->environment('testing') && ! app()->bound('publish-whats-new')) {
            return;
        }

        $post = NewsPost::firstOrNew(['version' => self::VERSION]);
        $post->forceFill([
            'user_id' => $post->user_id ?? User::where('is_admin', true)->orderBy('id')->value('id'),
            'title' => self::TITLE,
            'body' => self::BODY,
            'published_at' => $post->published_at ?? now(),
        ])->save();
    }

    public function down(): void
    {
        NewsPost::where('version', self::VERSION)->where('title', self::TITLE)->delete();
    }

    private const BODY = <<<'MARKDOWN'
Your pet can now hunt the creatures for you, the vendor sells crafting materials for the coins you earn, and you can craft arrows and Haste Potions.

## Your pet bites back
- **A new setting, Your pet**: Defensive, as before, it fetches loot and bites what falls at you. **Aggressive**, it goes for the creatures first whenever there are any, leaps at them as they come down and bites a good chunk out of each. A creature it brings down pays its coins and loot as one you shoot.
- With no creatures about, an aggressive pet fetches and bites as ever.

## Buy materials with your coins
- **The Vendor** (under your bags) now sells every crafting material: cloth, leather, feathers and herbs for 50 copper, bars and reagents for 1 silver 25, the Fiery and Lava Cores for 5 silver, a Black Lotus for 10.
- **Short of something for a recipe?** The crafting screen has a button to buy exactly what is missing.
- What you buy goes into your bank; move it into your bags to craft.

## New recipes
- **Arrows**: a Light Feather and a Rugged Leather make a bundle of 50, which fill your quiver as a game starts and whenever it runs dry.
- **Haste Potion**: a Fadeleaf and an Essence of Water. Drink it in a fight with **J** (or tap its slot) for Haste. Catch a Haste while you are already hasted and it goes into your bags as a potion instead of going to waste.

## Fixed
- **The Alliance hunter's neck** shows properly in his pajama top again, instead of a grey collar.
MARKDOWN;
};
