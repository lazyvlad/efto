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

        $post = self::post($game);

        // After the player has their answer: the game does not wait for Discord
        defer(function () use ($webhook, $post) {
            try {
                Http::timeout(5)->post($webhook, $post + [
                    // A player's name must not be able to ping anyone
                    'allowed_mentions' => ['parse' => []],
                ]);
            } catch (Throwable $e) {
                Log::warning('Discord did not take the game post: '.$e->getMessage());
            }
        });
    }

    /**
     * What is posted for a game: the line, beside the portrait of the hunter who played it in
     * his side's colour. A game from before there were sides is posted as the line alone.
     */
    public static function post(Game $game): array
    {
        $message = self::message($game);
        $portrait = HunterPortrait::thumbnailUrl($game->faction);

        if ($portrait === null) {
            return ['content' => $message];
        }

        return ['embeds' => [[
            'description' => $message,
            'color' => $game->faction === 'horde' ? 0x8C1616 : 0x1F4FA8,
            'thumbnail' => ['url' => $portrait],
        ]]];
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

            if (! $won && $last) {
                $line .= " Last boss down: {$last['name']}.";
            }

            // As the high scores have it: among the scores of its own version
            $rank = Score::rankOf($game->score, $game->version_rank);
            $version = $game->game_version ? " of version {$game->game_version}" : '';
            if ($rank <= 10) {
                $line .= $rank === 1 ? " That is the new top score{$version}." : " That is #{$rank}{$version} on the leaderboard.";
            }
        }

        // In angle brackets, so Discord does not unfold the site's card under every post
        return $line.' <'.route('home').'>';
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
