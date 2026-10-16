<?php

namespace App\Console\Commands;

use App\Models\BossDrop;
use App\Models\Game;
use App\Models\GameDrop;
use App\Models\Score;
use App\Support\DiscordFeed;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sends the game channel's posts for made-up games of every kind to the webhook this machine
 * has (DISCORD_WEBHOOK_URL), to see how they look: on a development server, a channel of its
 * own. The games are made in a transaction that is rolled back, so nothing is kept.
 */
class DiscordPreview extends Command
{
    protected $signature = 'input:discord-preview
        {--show : Print the posts instead of sending them}';

    protected $description = 'Send sample game-channel posts to this machine\'s Discord webhook';

    public function handle(): int
    {
        $webhook = config('services.discord.webhook');
        if (! $this->option('show') && blank($webhook)) {
            $this->error('No DISCORD_WEBHOOK_URL on this machine.');

            return self::FAILURE;
        }

        $posts = [];
        DB::beginTransaction();
        try {
            foreach ($this->samples() as $title => $sample) {
                $game = $this->game($sample);
                $image = DiscordFeed::image($game);
                $posts[$title] = ['post' => DiscordFeed::post($game, $image !== null), 'reactions' => DiscordFeed::reactions($game), 'image' => $image];
            }
        } finally {
            DB::rollBack();
        }

        foreach ($posts as $title => ['post' => $post, 'reactions' => $reactions, 'image' => $image]) {
            if ($this->option('show')) {
                if ($image !== null) {
                    $file = storage_path('app/discord-preview-'.Str::slug($title).'.png');
                    file_put_contents($file, $image);
                    $this->line("<comment>picture: {$file}</comment>");
                }
                $this->line("<info>{$title}</info>  ".implode(' ', $reactions));
                $this->line(json_encode($post, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));

                continue;
            }
            DiscordFeed::send($webhook, $post, $reactions, $image)
                ? $this->info("Sent: {$title}  ".implode(' ', $reactions).(filled(config('services.discord.bot_token')) ? '' : ' (no bot: no reactions)'))
                : $this->error("Discord refused {$title} (see the log)");
            // Discord takes about five posts a few seconds from one webhook
            usleep(800_000);
        }

        return self::SUCCESS;
    }

    /** The games shown, one of each kind the channel is told about */
    private function samples(): array
    {
        $alliance = array_keys(config('boss_loot.bosses.alliance'));
        $horde = array_keys(config('boss_loot.bosses.horde'));

        return [
            'A normal game, four bosses down' => ['faction' => 'alliance', 'score' => 18450, 'level' => 9, 'seconds' => 512, 'coins' => 4385, 'bosses' => array_slice($alliance, 0, 4), 'caught' => ['giantstalker-gloves', 'zee']],
            'A normal game, the last boss down' => ['faction' => 'horde', 'score' => 96120, 'level' => 20, 'seconds' => 1712, 'coins' => 61240, 'bosses' => $horde, 'caught' => ['ThunderFury', 'cryptstalker-helmet']],
            'A Boss Rush, fallen after four' => ['faction' => 'alliance', 'mode' => Game::BOSS_RUSH, 'score' => 6200, 'level' => 8, 'seconds' => 420, 'coins' => 1950, 'bosses' => array_slice($alliance, 0, 4)],
            'A Boss Rush, cleared' => ['faction' => 'horde', 'mode' => Game::BOSS_RUSH, 'score' => 31000, 'level' => 20, 'seconds' => 1040, 'coins' => 12500, 'bosses' => $horde],
            'A boss fight, won' => ['faction' => 'alliance', 'mode' => Game::BOSS_FIGHT, 'score' => 900, 'level' => 2, 'seconds' => 75, 'coins' => 120, 'bosses' => [$alliance[1]]],
        ];
    }

    private function game(array $sample): Game
    {
        $game = Game::forceCreate([
            'token' => Str::random(40),
            'name' => 'Previewer',
            'faction' => $sample['faction'],
            'mode' => $sample['mode'] ?? Game::NORMAL,
            'status' => Game::FINISHED,
            'score' => $sample['score'],
            'level' => $sample['level'],
            'game_time' => $sample['seconds'] ?? 900,
            'coins' => $sample['coins'] ?? 0,
            'game_version' => json_decode((string) file_get_contents(base_path('game/package.json')), true)['version'] ?? null,
            'started_at' => now()->subMinutes(15),
            'ended_at' => now(),
        ]);
        // Each boss its own drop: an epic now and then, mostly its blue
        foreach ($sample['bosses'] as $i => $bossId) {
            $loot = config("boss_loot.bosses.{$sample['faction']}.{$bossId}.loot");
            $rarity = $i % 3 === 2 && isset($loot['epic']) ? 'epic' : (isset($loot['rare']) ? 'rare' : 'uncommon');
            BossDrop::forceCreate(['game_id' => $game->id, 'boss_id' => $bossId, 'item_id' => $loot[$rarity]['id'] ?? 'preview', 'rarity' => $rarity, 'dropped_at' => now()->subMinutes(15 - $i)]);
        }
        // Rare things caught on the way
        foreach ($sample['caught'] ?? [] as $i => $itemId) {
            GameDrop::forceCreate(['game_id' => $game->id, 'item_id' => $itemId, 'chunk' => $i, 'at_seconds' => 60 * ($i + 1), 'falls' => true, 'claimed_at' => now()]);
        }
        // On the high scores, for the link to its page
        Score::forceCreate(['user_id' => null, 'game_id' => $game->id, 'name' => $game->name, 'score' => $game->score, 'level' => $game->level, 'game_time' => $game->game_time]);

        return $game;
    }
}
