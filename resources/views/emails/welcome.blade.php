<x-mail::message>
# {{ __('Your account is active, :name', ['name' => $name]) }}

{{ __('Thank you for confirming your email address. Everything you have earned is now yours to use.') }}

<x-mail::panel>
{{ __('Your purse: :coins', ['coins' => $coins]) }}
</x-mail::panel>

{{ __('What that opens up:') }}

- {{ __('**Coins.** Start a game in a later zone for :skip a zone, or enter Boss Rush for :rush a run.', ['skip' => $skipCost, 'rush' => $rushFee]) }}
- {{ __('**Hunter sets.** Wear Giantstalker, Dragonstalker or Cryptstalker in the game. A set gives more the more of its pieces you own.') }}
- {{ __('**The large quiver.** If a boss drops it, your quiver holds twice the arrows from then on.') }}

<x-mail::button :url="$playUrl">
{{ __('Play') }}
</x-mail::button>

{{ __('Your games, your collection and your sets are listed under [My Games](:url).', ['url' => $gamesUrl]) }}
</x-mail::message>
