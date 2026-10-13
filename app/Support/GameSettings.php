<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * The game settings an admin has changed (config/game_settings.php lists which can be). The
 * changed values are laid over the server's config when the application starts, and handed to
 * the game with its page.
 */
class GameSettings
{
    /** The values from the files, before anything was laid over them. */
    private array $defaults = [];

    /** The changed values, once they have been read. */
    private ?array $changed = null;

    /**
     * Every setting that can be changed, by its key.
     *
     * @return array<string, array<string, mixed>>
     */
    public function definitions(): array
    {
        return config('game_settings.settings');
    }

    /**
     * The values that differ from the game's own.
     *
     * @return array<string, float>
     */
    public function changed(): array
    {
        if ($this->changed === null) {
            try {
                // Read once for each request: a handful of rows, and never out of date
                $rows = DB::table('settings')->pluck('value', 'key')->all();
            } catch (Throwable) {
                // No table yet (before the migration has run): everything is as the files say
                return [];
            }

            $this->changed = array_map('floatval', array_intersect_key($rows, $this->definitions()));
        }

        return $this->changed;
    }

    /**
     * Lay the changed values over the server's config. Run when the application starts and
     * again after a change.
     */
    public function apply(): void
    {
        foreach ($this->definitions() as $key => $setting) {
            if (isset($setting['config'])) {
                $this->defaults[$key] ??= config($setting['config']);
                config([$setting['config'] => $this->value($key)]);
            }
        }
    }

    /**
     * The game's own value of a setting.
     */
    public function default(string $key): int|float
    {
        $setting = $this->definitions()[$key];

        return $this->number($setting['default'] ?? $this->defaults[$key] ?? config($setting['config']));
    }

    /**
     * The value in force.
     */
    public function value(string $key): int|float
    {
        return $this->number($this->changed()[$key] ?? $this->default($key));
    }

    /**
     * Change settings. A value equal to the game's own is forgotten rather than kept.
     *
     * @param  array<string, int|float|string>  $values
     */
    public function save(array $values): void
    {
        foreach (array_intersect_key($values, $this->definitions()) as $key => $value) {
            if (abs((float) $value - $this->default($key)) < 1e-9) {
                DB::table('settings')->where('key', $key)->delete();
            } else {
                DB::table('settings')->updateOrInsert(['key' => $key], ['value' => (float) $value, 'updated_at' => now(), 'created_at' => now()]);
            }
        }

        $this->refresh();
    }

    /**
     * Put every setting back to the game's own value.
     */
    public function reset(): void
    {
        DB::table('settings')->delete();

        $this->refresh();
    }

    /**
     * What the game is told with its page: the changed values, by their place in gameConfig.
     *
     * @return array<string, int|float>
     */
    public function forGame(): array
    {
        $values = [];

        foreach ($this->changed() as $key => $value) {
            if (isset($this->definitions()[$key]['game'])) {
                $values[$this->definitions()[$key]['game']] = $this->number($value);
            }
        }

        return $values;
    }

    private function refresh(): void
    {
        $this->changed = null;
        $this->apply();
    }

    /**
     * Whole numbers stay whole, so a price does not become 5000.0.
     */
    private function number(mixed $value): int|float
    {
        return (float) $value == (int) $value ? (int) $value : (float) $value;
    }
}
