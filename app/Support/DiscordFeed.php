<?php

namespace App\Support;

use App\Models\Game;
use App\Models\Score;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Posts to the guild's Discord channel when a game has been played, through a channel webhook
 * (config/services.php, "discord.webhook"). Left empty, nothing is posted.
 */
class DiscordFeed
{
    /**
     * Tell the channel about a game that just ended. Only games that count are told: played to
     * the end with the server deciding the loot, and with something to show for it.
     */
    public static function gamePlayed(Game $game): void
    {
        $webhook = config('services.discord.webhook');

        if (blank($webhook) || ! $game->isLegal() || $game->score <= 0) {
            return;
        }

        // A single boss fight is worth telling only when the boss went down
        if ($game->isBossFight() && $game->bossDrops()->doesntExist()) {
            return;
        }

        $image = self::image($game);
        $post = self::post($game, $image !== null);
        $reactions = self::reactions($game);

        // After the player has their answer: the game does not wait for Discord
        defer(fn () => self::send($webhook, $post, $reactions, $image));
    }

    /**
     * Post to the channel, then (with a bot set up) react to the post. Discord being down or
     * refusing is logged, never passed on.
     *
     * @param  array<int, string>  $reactions
     * @param  ?string  $image  The picture under the card (PNG), attached as game.png
     */
    public static function send(string $webhook, array $post, array $reactions = [], ?string $image = null): bool
    {
        try {
            // "wait": Discord answers with the message, whose id the reactions need
            $url = $webhook.(str_contains($webhook, '?') ? '&' : '?').'wait=true';
            // A player's name must not be able to ping anyone
            $post += ['allowed_mentions' => ['parse' => []]];
            $response = $image === null
                ? Http::timeout(5)->post($url, $post)
                : Http::timeout(10)->attach('files[0]', $image, self::IMAGE)->post($url, ['payload_json' => json_encode($post)]);
            if (! $response->successful()) {
                Log::warning('Discord did not take the game post: '.$response->status());

                return false;
            }

            $bot = config('services.discord.bot_token');
            $channel = $response->json('channel_id');
            $message = $response->json('id');
            if (filled($bot) && $channel && $message) {
                foreach ($reactions as $i => $emoji) {
                    // Discord takes about one reaction every quarter second from a bot
                    if ($i > 0) {
                        usleep(300_000);
                    }
                    $reacted = Http::timeout(5)->withHeaders(['Authorization' => 'Bot '.$bot])
                        ->withBody('', 'application/json')
                        ->put(self::API."/channels/{$channel}/messages/{$message}/reactions/".rawurlencode($emoji).'/@me');
                    if (! $reacted->successful()) {
                        // Most likely the bot cannot see the channel or add reactions in it
                        Log::warning("Discord did not take the bot's reaction {$emoji}: ".$reacted->status().' '.$reacted->json('message'));
                        break;
                    }
                }
            }

            return true;
        } catch (Throwable $e) {
            Log::warning('Discord did not take the game post: '.$e->getMessage());

            return false;
        }
    }

    private const API = 'https://discord.com/api/v10';

    /**
     * The reactions a post gets: the same on every game (services.discord.reactions), the
     * server's own emojis as "name:id".
     *
     * @return array<int, string>
     */
    public static function reactions(Game $game): array
    {
        return config('services.discord.reactions', []);
    }

    /**
     * What is posted for a game: a card in his side's colour, beside the portrait of the hunter
     * who played it. The line at the top, then how long it took, the coins it made, the bosses
     * brought down and the best loot, and links to the game's own page and the high scores.
     */
    public static function post(Game $game, bool $withImage = false): array
    {
        $embed = [
            'description' => self::message($game)."\n".self::links($game),
            'color' => $game->faction === 'horde' ? 0x8C1616 : 0x1F4FA8,
            'fields' => self::fields($game),
        ];
        // The bosses and the loot as pictures, under the card (self::image)
        if ($withImage) {
            $embed['image'] = ['url' => 'attachment://'.self::IMAGE];
        }
        if (($portrait = HunterPortrait::thumbnailUrl($game->faction)) !== null) {
            $embed['thumbnail'] = ['url' => $portrait];
        }

        return ['embeds' => [$embed]];
    }

    /** The attached picture's name */
    private const IMAGE = 'game.png';

    /**
     * The picture under the card: the bosses brought down, then the best loot in frames of its
     * rarity's colour (App\Support\GameCardImage). Null with neither to show.
     */
    public static function image(Game $game): ?string
    {
        $bosses = $game->bossDrops()->orderBy('dropped_at')->pluck('boss_id')
            ->map(fn ($id) => BossLoot::boss($id)['image'] ?? null)->all();

        return GameCardImage::png($bosses, self::bestLoot($game));
    }

    /** Time, coins, bosses and loot, as the card's fields; those with nothing to say left out */
    private static function fields(Game $game): array
    {
        $fields = [['name' => 'Time', 'value' => self::duration((int) $game->game_time), 'inline' => true]];
        if ((int) $game->coins > 0) {
            $fields[] = ['name' => 'Coins', 'value' => Coins::format((int) $game->coins), 'inline' => true];
        }

        $bosses = $game->bossDrops()->orderBy('dropped_at')->pluck('boss_id')
            ->map(fn ($id) => BossLoot::boss($id)['name'] ?? $id);
        if ($bosses->isNotEmpty()) {
            $fields[] = ['name' => 'Bosses down ('.$bosses->count().')', 'value' => self::fit($bosses->implode(' · ')), 'inline' => false];
        }

        $loot = self::notableLoot($game);
        if ($loot !== []) {
            $shown = array_slice($loot, 0, self::LOOT_SHOWN);
            $more = count($loot) - count($shown);
            $fields[] = ['name' => 'Best loot', 'value' => self::fit(implode("\n", $shown).($more > 0 ? "\n…and {$more} more" : '')), 'inline' => false];
        }

        return $fields;
    }

    /** At most this many pieces of loot are named, the rarest first */
    private const LOOT_SHOWN = 8;

    /** Loot worth telling, by its rarity: a mark for each (as the item colours) */
    private const RARE = ['legendary' => '🟠', 'epic' => '🟣', 'rare' => '🔵'];

    /**
     * The rare, epic and legendary things the game brought: what the bosses dropped and what
     * was caught, rarest first, each named once with how many.
     *
     * @return array<int, string>
     */
    public static function notableLoot(Game $game): array
    {
        return array_map(
            fn ($item) => self::RARE[$item['rarity']].' '.$item['name'].($item['times'] > 1 ? " ×{$item['times']}" : ''),
            self::bestLoot($game)
        );
    }

    /**
     * The same, as items: id, name, rarity, how many, and the picture in the game's folder.
     *
     * @return array<int, array{id: string, name: string, rarity: string, times: int, image: ?string}>
     */
    public static function bestLoot(Game $game): array
    {
        $gear = Gear::catalog();
        $items = LootTable::catalog();
        $pictures = config('loot.catalog');
        // An item's rarity, as the gear and the falling items name theirs
        $rarityOf = function (string $itemId, ?string $dropped = null) use ($gear, $items): ?string {
            $rarity = $dropped ?? $gear[$itemId]['rarity'] ?? match ($items[$itemId]['type'] ?? null) {
                'legendary', 'zee_zgnan' => 'legendary',
                'epic', 'set_piece' => 'epic',
                'special' => 'rare',
                default => null,
            };

            return isset(self::RARE[$rarity]) ? $rarity : null;
        };

        $found = [];
        foreach ($game->bossDrops()->get(['item_id', 'rarity']) as $drop) {
            if ($drop->item_id && ($rarity = $rarityOf($drop->item_id, $drop->rarity))) {
                $found[$drop->item_id] = ['rarity' => $rarity, 'times' => ($found[$drop->item_id]['times'] ?? 0) + 1];
            }
        }
        foreach ($game->pickups()->pluck('item_id') as $itemId) {
            if ($rarity = $rarityOf($itemId)) {
                $found[$itemId] = ['rarity' => $found[$itemId]['rarity'] ?? $rarity, 'times' => ($found[$itemId]['times'] ?? 0) + 1];
            }
        }

        $order = array_flip(array_keys(self::RARE));
        uasort($found, fn ($a, $b) => $order[$a['rarity']] <=> $order[$b['rarity']]);

        $loot = [];
        foreach ($found as $itemId => $item) {
            $loot[] = [
                'id' => $itemId,
                'name' => $gear[$itemId]['name'] ?? $items[$itemId]['name'] ?? $itemId,
                'rarity' => $item['rarity'],
                'times' => $item['times'],
                'image' => $gear[$itemId]['image'] ?? $pictures[$itemId]['image'] ?? null,
            ];
        }

        return $loot;
    }

    /** Where to see more: the game's own page (once it is on the high scores) and the high scores */
    private static function links(Game $game): string
    {
        $links = [];
        if ($game->scoreEntry()->exists()) {
            $links[] = '[The game]('.route('games.show', $game).')';
        }
        $links[] = '[High scores]('.route('highscores').')';
        $links[] = '[Play]('.route('home').')';

        return implode(' · ', $links);
    }

    private static function duration(int $seconds): string
    {
        return $seconds >= 3600
            ? sprintf('%dh %02dm', intdiv($seconds, 3600), intdiv($seconds % 3600, 60))
            : sprintf('%d:%02d', intdiv($seconds, 60), $seconds % 60);
    }

    /** A field's value within what Discord takes (1024 characters) */
    private static function fit(string $value): string
    {
        return mb_strlen($value) > 1024 ? mb_substr($value, 0, 1020).'…' : $value;
    }

    /**
     * The line posted for a game.
     */
    public static function message(Game $game): string
    {
        // A player who connected Discord is called what the channel knows them as
        $name = '**'.self::plain($game->user?->discord_name ?: $game->name).'**';
        $bosses = $game->bossDrops()->orderBy('dropped_at')->pluck('boss_id');
        $last = $bosses->isNotEmpty() ? BossLoot::boss($bosses->last()) : null;
        $side = $game->faction ? ucfirst($game->faction) : null;

        $won = $last !== null && $last['zone'] >= count(config('boss_loot.bosses.'.$last['faction'], []));

        if ($game->isBossFight()) {
            $line = $last
                ? "{$name} brought down {$last['name']} in a boss fight."
                : "{$name} lost a boss fight.";
        } elseif ($game->isBossRush()) {
            $line = $won
                ? "{$name} cleared the {$side} Boss Rush: all {$bosses->count()} bosses down."
                : "{$name} fell in the {$side} Boss Rush after {$bosses->count()} ".($bosses->count() === 1 ? 'boss' : 'bosses').'.';
        } else {
            $line = $won
                ? "{$name} beat the game for the {$side}: {$last['name']} is down. Score ".number_format($game->score).'.'
                : "{$name} scored ".number_format($game->score)." at level {$game->level}".($side ? " for the {$side}" : '').'.';

            // As the high scores have it: among the scores of its own version
            $rank = Score::rankOf($game->score, $game->version_rank);
            $version = $game->game_version ? " of version {$game->game_version}" : '';
            if ($rank <= 10) {
                $line .= $rank === 1 ? " That is the new top score{$version}." : " That is #{$rank}{$version} on the leaderboard.";
            }
        }

        return $line;
    }

    /**
     * A name as plain text: nothing in it that Discord would read as formatting or a link.
     */
    private static function plain(?string $name): string
    {
        $name = preg_replace('/[\\\\*_~`|>\[\]()@#:\/]/u', '', (string) $name);

        return trim($name) !== '' ? trim($name) : 'Someone';
    }
}
