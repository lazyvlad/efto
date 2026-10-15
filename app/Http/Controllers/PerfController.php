<?php

namespace App\Http\Controllers;

use App\Models\PerfSample;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Debug mode's measurements, as the game sends them every few seconds of play
 * (game/utils/perfProbe.js). Kept to be looked at under Admin → Performance.
 */
class PerfController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9-]+$/'],
            'version' => ['nullable', 'string', 'max:20'],
            'device' => ['nullable', 'array', 'max:20'],
            'sample' => ['required', 'array', 'max:40'],
            'sample.fps' => ['required', 'numeric', 'min:0', 'max:1000'],
        ]);

        // Only plain values, of a sensible length: it is shown as it came
        $plain = fn (array $values) => collect($values)
            ->filter(fn ($value) => is_scalar($value) || $value === null)
            ->map(fn ($value) => is_string($value) ? mb_substr($value, 0, 300) : $value)
            ->all();

        PerfSample::create([
            'user_id' => $request->user()?->id,
            'session' => $data['session'],
            'game_version' => $data['version'] ?? null,
            // Checked above; taken whole from the request (the checked data holds only fps)
            'device' => $plain((array) $request->input('device', [])),
            'sample' => $plain((array) $request->input('sample', [])),
        ]);

        return response()->json(['kept' => true]);
    }
}
