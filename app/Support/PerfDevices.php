<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * How the game runs, by device: the samples players' games send (game/utils/perfProbe.js),
 * gathered under each graphics card and system, for Admin → Performance.
 */
class PerfDevices
{
    /** The graphics card as people know it: "NVIDIA GeForce RTX 5080" out of the ANGLE string */
    public static function gpu(?string $renderer): string
    {
        if (! $renderer) {
            return 'Graphics card not told';
        }
        // ANGLE (Vendor, Card (0x...) Direct3D11 vs_5_0 ps_5_0, D3D11) → Card; on a Mac,
        // ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version) → Apple M2
        if (preg_match('/^ANGLE \((.*)\)$/', $renderer, $match)) {
            $parts = explode(', ', $match[1]);
            $card = count($parts) >= 3 ? implode(', ', array_slice($parts, 1, -1)) : ($parts[1] ?? $parts[0]);
            $card = preg_replace(['/^ANGLE Metal Renderer: /', '/ \(0x[0-9A-Fa-f]+\)/', '/ (Direct3D|OpenGL|Metal|Vulkan).*$/'], '', $card);

            return trim($card) ?: 'Graphics card not told';
        }

        return trim($renderer);
    }

    /** The system and browser: "Windows · Chrome", "iPhone · Safari" */
    public static function system(?string $userAgent): string
    {
        $ua = (string) $userAgent;
        $os = match (true) {
            str_contains($ua, 'iPhone') => 'iPhone',
            str_contains($ua, 'iPad') => 'iPad',
            str_contains($ua, 'Android') => 'Android',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'CrOS') => 'ChromeOS',
            str_contains($ua, 'Mac OS X') || str_contains($ua, 'Macintosh') => 'Mac',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Other system',
        };
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') => 'Opera',
            str_contains($ua, 'Firefox/') || str_contains($ua, 'FxiOS') => 'Firefox',
            str_contains($ua, 'CriOS') || str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Other browser',
        };

        return "$os · $browser";
    }

    /**
     * The samples gathered by device, the most played first: how many games and minutes, the
     * frame rate on average and at its worst tenth, slow frames a minute, and the share of
     * play under 50 frames a second.
     *
     * @param  Collection<int, \App\Models\PerfSample>  $samples
     * @return array<int, array<string, mixed>>
     */
    public static function summary(Collection $samples): array
    {
        $groups = $samples->groupBy(fn ($sample) => self::gpu($sample->device['gpu'] ?? null).'|'.self::system($sample->device['userAgent'] ?? null));

        return $groups->map(function (Collection $list, string $key) {
            [$gpu, $system] = explode('|', $key, 2);
            $seconds = max(1, (float) $list->sum(fn ($sample) => (float) ($sample->sample['seconds'] ?? 0)));
            $fps = $list->map(fn ($sample) => (float) ($sample->sample['fps'] ?? 0))->filter()->sort()->values();
            $slow = $list->sum(fn ($sample) => (int) ($sample->sample['over33'] ?? 0));
            $under50 = $list->filter(fn ($sample) => (float) ($sample->sample['fps'] ?? 0) < 50)->sum(fn ($sample) => (float) ($sample->sample['seconds'] ?? 0));
            $windows = $list->map(fn ($sample) => $sample->device['window'] ?? null)->filter()->countBy()->sortDesc();

            return [
                'gpu' => $gpu,
                'system' => $system,
                'touch' => (bool) $list->contains(fn ($sample) => ! empty($sample->device['touch'])),
                'window' => $windows->keys()->first(),
                'games' => $list->pluck('session')->unique()->count(),
                'players' => $list->pluck('user_id')->filter()->unique()->count(),
                'minutes' => round($seconds / 60, 1),
                'fps' => $fps->count() ? round($fps->avg(), 1) : null,
                'lowFps' => $fps->count() ? round($fps[(int) floor($fps->count() * 0.1)], 1) : null,
                'slowPerMinute' => round($slow / ($seconds / 60), 1),
                'under50' => (int) round(100 * $under50 / $seconds),
            ];
        })->sortByDesc('minutes')->values()->all();
    }
}
