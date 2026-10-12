<?php

namespace App\Console\Commands;

use App\Models\Score;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class ImportScores extends Command
{
    protected $signature = 'scores:import {file : Path to a highscores.json from the pre-Laravel game}';

    protected $description = 'Import high scores from the old JSON file as guest scores';

    public function handle(): int
    {
        $file = $this->argument('file');

        if (! is_file($file)) {
            $this->error("File not found: {$file}");

            return self::FAILURE;
        }

        $entries = json_decode(file_get_contents($file), true);

        if (! is_array($entries)) {
            $this->error('That file does not contain a list of scores.');

            return self::FAILURE;
        }

        $imported = 0;

        foreach ($entries as $entry) {
            if (! is_array($entry) || ! is_numeric($entry['score'] ?? null)) {
                continue;
            }

            try {
                $playedAt = isset($entry['timestamp']) ? Carbon::parse($entry['timestamp']) : now();
            } catch (\Throwable) {
                $playedAt = now();
            }

            Score::create([
                'name' => Score::cleanName($entry['name'] ?? '') ?: 'Anonymous',
                'score' => max(0, (int) $entry['score']),
                'level' => max(0, (int) ($entry['level'] ?? 1)),
                'game_time' => max(0, (int) ($entry['gameTime'] ?? 0)),
                'dragonstalker_completions' => max(0, (int) ($entry['dragonstalkerCompletions'] ?? 0)),
                'final_crit_rating' => (float) ($entry['finalCritRating'] ?? 0),
                'final_dodge_rating' => (float) ($entry['finalDodgeRating'] ?? 0),
                'created_at' => $playedAt,
            ]);

            $imported++;
        }

        $this->info("Imported {$imported} score(s).");

        return self::SUCCESS;
    }
}
