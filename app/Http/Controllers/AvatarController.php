<?php

namespace App\Http\Controllers;

use App\Support\Avatar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rules\File;

class AvatarController extends Controller
{
    /**
     * Save a new profile image. The profile page sends it already cropped, from a script;
     * a plain form post works too.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $request->validateWithBag('avatar', [
            'avatar' => [
                'required',
                File::types(['jpg', 'jpeg', 'png', 'webp', 'gif'])->max(4 * 1024),
                'dimensions:min_width=64,min_height=64,max_width=6000,max_height=6000',
            ],
        ]);

        Avatar::store($request->user(), $request->file('avatar'));

        return $request->expectsJson()
            ? response()->json(['url' => $request->user()->avatarUrl()])
            : Redirect::route('profile.edit')->with('status', 'avatar-updated');
    }

    public function destroy(Request $request): RedirectResponse
    {
        Avatar::remove($request->user());

        return Redirect::route('profile.edit')->with('status', 'avatar-removed');
    }
}
