<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\GameSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * The numbers of the game an admin may change without a new version.
 */
class SettingsController extends Controller
{
    public function edit(GameSettings $settings): View
    {
        $groups = [];

        foreach ($settings->definitions() as $key => $setting) {
            $groups[$setting['group']][$key] = $setting + [
                'value' => $settings->value($key),
                'own' => $settings->default($key),
            ];
        }

        return view('admin.settings', [
            'groups' => $groups,
            'notes' => config('game_settings.groups'),
            'changed' => count($settings->changed()),
        ]);
    }

    public function update(Request $request, GameSettings $settings): RedirectResponse
    {
        $rules = [];

        foreach ($settings->definitions() as $key => $setting) {
            $rules[$key] = ['required', 'numeric', 'min:'.$setting['min'], 'max:'.$setting['max']];
        }

        $names = array_map(fn (array $setting) => '"'.$setting['label'].'"', $settings->definitions());

        $settings->save($request->validate($rules, [], $names));

        return back()->with('status', __('Saved. Games started from now on use these settings.'));
    }

    public function reset(GameSettings $settings): RedirectResponse
    {
        $settings->reset();

        return back()->with('status', __('Every setting is back to the game\'s own value.'));
    }
}
