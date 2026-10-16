<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PerfSample;
use App\Support\PerfDevices;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

/**
 * How the game runs: by device, from the samples of the last month (a share of everyone's games,
 * and debug mode's); then each session (one page load of the game), how it ran on the whole,
 * and its samples one by one.
 */
class PerfController extends Controller
{
    public function index(Request $request): View
    {
        // By device: everything, or only players' sampled games, or only debug mode's
        $source = in_array($request->query('source'), ['sampled', 'debug'], true) ? $request->query('source') : 'all';
        $recent = PerfSample::where('created_at', '>=', now()->subDays((int) config('game.perf_keep_days')))->get(['session', 'user_id', 'device', 'sample'])
            ->filter(fn ($sample) => $source === 'all' || ($sample->sample['source'] ?? 'debug') === $source);

        $sessions = PerfSample::query()
            ->select('session', DB::raw('min(created_at) as started_at'), DB::raw('max(created_at) as ended_at'), DB::raw('count(*) as samples'), DB::raw('max(id) as last_id'))
            ->groupBy('session')
            ->orderByDesc('last_id')
            ->limit(50)
            ->get();

        // Each session's first sample says who, which version and what device; all of them how it ran
        $samples = PerfSample::with('user')->whereIn('session', $sessions->pluck('session'))->orderBy('id')->get()->groupBy('session');

        return view('admin.perf.index', [
            'source' => $source,
            'devices' => PerfDevices::summary($recent->values()),
            'sessions' => $sessions->map(function ($session) use ($samples) {
                $list = $samples[$session->session];
                $fps = $list->pluck('sample.fps')->filter(fn ($value) => $value !== null);

                return [
                    'session' => $session->session,
                    'startedAt' => $list->first()->created_at,
                    'user' => $list->first()->user?->name,
                    'sampled' => ($list->first()->sample['source'] ?? 'debug') === 'sampled',
                    'version' => $list->first()->game_version,
                    'device' => $list->first()->device ?? [],
                    'samples' => $list->count(),
                    'fps' => $fps->count() ? round($fps->avg(), 1) : null,
                    'worstFps' => $fps->count() ? round($fps->min(), 1) : null,
                    'p95' => round((float) $list->pluck('sample.p95')->max(), 1),
                ];
            }),
        ]);
    }

    public function show(string $session): View
    {
        $samples = PerfSample::with('user')->where('session', $session)->orderBy('id')->get();
        abort_if($samples->isEmpty(), 404);

        return view('admin.perf.show', ['session' => $session, 'samples' => $samples, 'first' => $samples->first()]);
    }
}
